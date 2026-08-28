from datetime import datetime
from typing import Dict, List, Optional, Set, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import TenantId
from watchmen_storage import TransactionalStorageSPI
from watchmen_utilities import is_blank, is_not_blank

from watchmen_metricflow.meta.data_product_meta_service import DataProductService
from watchmen_metricflow.service.asset_value_service import _iter_parameter_topic_ids, _read

# ODPG v1.0 (Open Data Product Graphs) constants
ODPG_SCHEMA = 'https://opendataproducts.org/odpg-v1.0/schema/odpg.yaml'
ODPG_VERSION = '1.0'
# pipeline-derived product dependencies are inferred, not human declared
CONFIDENCE_INFERRED = 'medium'


def _pipeline_topic_flows(pipeline) -> Set[Tuple[str, str]]:
    """
    (source_topic_id, target_topic_id) data flows a pipeline creates: the trigger
    topic and every read source flowing into each write target. Actions may be
    raw dicts (ExtendedBaseModel skips nested coercion) - told apart by shape.
    """
    trigger = _read(pipeline, 'topicId')
    write_targets: List[str] = []
    read_topics: Set[str] = set()
    for stage in (_read(pipeline, 'stages') or []):
        for unit in (_read(stage, 'units') or []):
            for action in (_read(unit, 'do') or []):
                mapping = _read(action, 'mapping')
                if mapping:
                    if is_not_blank(_read(action, 'topicId')):
                        write_targets.append(_read(action, 'topicId'))
                    for entry in mapping:
                        read_topics |= _iter_parameter_topic_ids(_read(entry, 'source'))
                elif is_not_blank(_read(action, 'factorId')):
                    if is_not_blank(_read(action, 'topicId')):
                        write_targets.append(_read(action, 'topicId'))
                    read_topics |= _iter_parameter_topic_ids(_read(action, 'source'))
                else:
                    topic_id = _read(action, 'topicId')
                    if is_not_blank(topic_id):
                        read_topics.add(topic_id)

    flows: Set[Tuple[str, str]] = set()
    for target in write_targets:
        if is_not_blank(trigger) and trigger != target:
            flows.add((trigger, target))
        for source in read_topics:
            if source != target:
                flows.add((source, target))
    return flows


def _topic_flows_to_product_edges(
        flows: Set[Tuple[str, str]], topic_products: Dict[str, Set[str]]) -> Dict[Tuple[str, str], int]:
    """
    Translate topic-level flows into product-level dependsOn edge counts:
    a pipeline carrying data from a topic of product A into a topic of product B
    means A dependsOn B.
    """
    edges: Dict[Tuple[str, str], int] = {}
    for source_topic, target_topic in flows:
        for source_product in topic_products.get(source_topic, set()):
            for target_product in topic_products.get(target_topic, set()):
                if source_product != target_product:
                    key = (source_product, target_product)
                    edges[key] = edges.get(key, 0) + 1
    return edges


def _in_graph_subgraph(edges: List[dict], focus_id: str, depth: int) -> Set[str]:
    """Node ids within `depth` hops (any direction) of the focus node."""
    adjacency: Dict[str, Set[str]] = {}
    for edge in edges:
        adjacency.setdefault(edge['from'], set()).add(edge['to'])
        adjacency.setdefault(edge['to'], set()).add(edge['from'])
    visited = {focus_id}
    frontier = [focus_id]
    level = 0
    while frontier and level < depth:
        level += 1
        next_frontier = []
        for node_id in frontier:
            for neighbor in adjacency.get(node_id, set()):
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_frontier.append(neighbor)
        frontier = next_frontier
    return visited


def build_product_graph(
        storage: TransactionalStorageSPI,
        principal_service: PrincipalService,
        domain: Optional[str] = None,
        query: Optional[str] = None,
        focus: Optional[str] = None,
        depth: int = 1,
        tenant_id: Optional[TenantId] = None,
) -> dict:
    """
    ODPG v1.0 shaped product-level graph: DataProduct nodes plus dependsOn edges
    derived from enabled pipelines (topic-level flows lifted to product level),
    Domain nodes from product.domain values. `focus` keeps only the subgraph
    within `depth` hops of the given product id. Must run inside the caller's
    transaction (see compute_auto_scores note in asset_value_service).
    """
    if tenant_id is None:
        tenant_id = principal_service.get_tenant_id()
    product_service = DataProductService(storage, ask_snowflake_generator(), principal_service)
    pipeline_service = PipelineService(storage, ask_snowflake_generator(), principal_service)

    products = product_service.list_products()
    pipelines = [p for p in pipeline_service.find_all(tenant_id) if _read(p, 'enabled') is not False]

    if is_not_blank(domain):
        products = [p for p in products if (p.domain or '') == domain]
    if is_not_blank(query):
        keyword = query.strip().lower()
        products = [p for p in products if keyword in (p.name or '').lower()
                    or keyword in (p.display_name or '').lower()
                    or keyword in (p.description or '').lower()]

    product_by_id = {p.id: p for p in products}

    topic_products: Dict[str, Set[str]] = {}
    for product in products:
        for topic_id in (product.topic_ids or []):
            topic_products.setdefault(topic_id, set()).add(product.id)

    topic_flows: Set[Tuple[str, str]] = set()
    for pipeline in pipelines:
        topic_flows |= _pipeline_topic_flows(pipeline)
    product_edge_counts = _topic_flows_to_product_edges(topic_flows, topic_products)

    edges: List[dict] = []
    for (source_id, target_id), count in sorted(product_edge_counts.items()):
        if source_id in product_by_id and target_id in product_by_id:
            edges.append({
                'from': f'product:{source_id}',
                'to': f'product:{target_id}',
                'type': 'dependsOn',
                'confidence': CONFIDENCE_INFERRED,
                'x-origin': 'pipeline',
                'x-topic-flow-count': count,
            })

    # manually declared dependencies: product P lists upstream products it consumes;
    # data flows upstream -> P, human-declared so confidence is high
    for product in products:
        for upstream_id in (product.upstream_product_ids or []):
            if upstream_id == product.id:
                continue
            if upstream_id not in product_by_id:
                # upstream product hidden by domain/query filters, or deleted
                continue
            edges.append({
                'from': f'product:{upstream_id}',
                'to': f'product:{product.id}',
                'type': 'dependsOn',
                'confidence': 'high',
                'x-origin': 'manual',
            })

    # domain nodes: one per distinct product.domain value
    domains: Dict[str, int] = {}
    for product in products:
        if is_not_blank(product.domain):
            domains[product.domain] = domains.get(product.domain, 0) + 1

    if focus is not None:
        kept = _in_graph_subgraph(edges, f'product:{focus}', max(1, depth))
        # drop edges pointing outside the kept subgraph, so the payload has no dangling edges
        edges = [edge for edge in edges if edge['from'] in kept and edge['to'] in kept]
    else:
        kept = None

    nodes: List[dict] = []
    for product in products:
        node_id = f'product:{product.id}'
        if kept is not None and node_id not in kept:
            continue
        nodes.append({
            'id': node_id,
            'type': 'DataProduct',
            '$ref': f'watchmen://data-product/{product.id}',
            'x-name': product.display_name or product.name,
            'x-status': product.status,
            'x-product-type': product.product_type,
            'x-domain': product.domain,
            'x-catalog-id': product.catalog_id,
            'x-value-score': product.value_score or 0,
            'x-topic-count': len(product.topic_ids or []),
        })
    for domain_name, count in sorted(domains.items()):
        node_id = f'domain:{domain_name}'
        # in focus mode keep a domain node only when the kept subgraph has products in it
        domain_products = [p for p in products if p.domain == domain_name
                           and (kept is None or f'product:{p.id}' in kept)]
        if not domain_products:
            continue
        nodes.append({
            'id': node_id,
            'type': 'Domain',
            '$ref': f'watchmen://domain/{domain_name}',
            'x-name': domain_name,
            'x-product-count': count,
        })
        for product in domain_products:
            edges.append({
                'from': f'product:{product.id}',
                'to': node_id,
                'type': 'alignsWith',
                'confidence': CONFIDENCE_INFERRED,
            })

    return {
        'schema': ODPG_SCHEMA,
        'version': ODPG_VERSION,
        'kind': 'Graph',
        'graph': {
            'metadata': {
                'id': f'watchmen-data-products:{tenant_id}',
                'name': {'en': 'Watchmen Data Product Graph'},
                'description': {'en': 'Data product dependency graph derived from pipelines and associations.'},
                'generatedAt': datetime.now().isoformat(),
                'x-tenant-id': tenant_id,
            },
            'nodes': nodes,
            'edges': edges,
        },
    }


__all__ = ['build_product_graph', 'ODPG_SCHEMA', 'ODPG_VERSION']
