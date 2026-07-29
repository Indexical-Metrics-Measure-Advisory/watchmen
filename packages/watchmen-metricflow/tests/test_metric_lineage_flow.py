import sys
import unittest
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))

from watchmen_metricflow.lineage.metric_lineage_models import LineageEdge, LineageNode, LineagePath, MetricLineageBranch, \
    MetricLineageSummary, MetricLineageViewData
from watchmen_metricflow.lineage.metric_lineage_pruner import apply_fanout_limit
from watchmen_metricflow.lineage.metric_lineage_service import MetricLineageService
from watchmen_metricflow.model.metrics import MeasureReference, MetricRef, MetricType, MetricTypeParams, MetricWithCategory
from watchmen_metricflow.model.semantic import AggregationType, Measure, NodeRelation, SemanticModel
from watchmen_model.admin import Factor, Pipeline, Topic
from watchmen_model.admin.topic import TopicType


class _FakePrincipal:
    userId = "u-test"
    tenantId = "t-test"

    @staticmethod
    def get_tenant_id():
        return "t-test"


@dataclass
class _FakeUpstreamTraceStep:
    kind: str
    pipeline: Optional[Pipeline] = None
    topic: Optional[Topic] = None
    factor: Optional[Factor] = None
    source_table_name: Optional[str] = None
    source_field_name: Optional[str] = None


@dataclass
class _FakeUpstreamTraceRoute:
    id_suffix: str
    title: str
    steps: List[_FakeUpstreamTraceStep] = field(default_factory=list)
    diagnostics: List[str] = field(default_factory=list)


class _FakeResolver:
    def __init__(
            self, metric, semantic_model=None, measure=None, topic=None, factor=None, pipeline=None,
            branches: Optional[List[MetricLineageBranch]] = None,
            semantic_results: Optional[Dict[str, Tuple[Optional[SemanticModel], Optional[object], List[str]]]] = None,
            topics: Optional[Dict[str, Optional[Topic]]] = None,
            factors: Optional[Dict[str, Optional[Factor]]] = None,
            pipelines: Optional[Dict[str, List[Pipeline]]] = None,
            pipeline_matches: Optional[Dict[str, Tuple[List[Pipeline], List[str]]]] = None,
            sources: Optional[Dict[str, Tuple[Optional[str], Optional[str]]]] = None,
            upstream_routes: Optional[Dict[str, List[_FakeUpstreamTraceRoute]]] = None
    ):
        self.metric = metric
        self.semantic_model = semantic_model
        self.measure = measure
        self.topic = topic
        self.factor = factor
        self.pipeline = pipeline
        self.branches = branches
        self.semantic_results = semantic_results or {}
        self.topics = topics or {}
        self.factors = factors or {}
        self.pipelines = pipelines or {}
        self.pipeline_matches = pipeline_matches or {}
        self.sources = sources or {}
        self.upstream_routes = upstream_routes or {}

    @staticmethod
    def normalize_metric_type(metric):
        return metric.type.value if hasattr(metric.type, 'value') else str(metric.type)

    def resolve_metric(self, metric_name, tenant_id):
        return self.metric if metric_name == self.metric.name else None

    def resolve_metric_branches(self, metric, tenant_id):
        if self.branches is not None:
            return self.branches
        return [MetricLineageBranch(
            id="primary",
            title="Primary lineage",
            branchType="primary",
            measureName="count_claim_cases",
            isPrimaryCandidate=True
        )]

    def resolve_semantic_for_branch(self, branch, tenant_id):
        if branch.id in self.semantic_results:
            return self.semantic_results[branch.id]
        return self.semantic_model, self.measure, []

    def resolve_topic(self, semantic_model):
        model_name = getattr(semantic_model, "name", None)
        if model_name in self.topics:
            return self.topics[model_name]
        return self.topic

    def resolve_topic_factor(self, topic, measure):
        measure_name = self._read_name(measure)
        if measure_name in self.factors:
            return self.factors[measure_name]
        return self.factor

    def resolve_pipelines(self, topic, tenant_id):
        topic_name = getattr(topic, "name", None)
        if topic_name in self.pipelines:
            return self.pipelines[topic_name]
        return [self.pipeline]

    def resolve_pipeline_factor_dependencies(self, pipelines, topic, factor):
        topic_name = getattr(topic, "name", None)
        if topic_name in self.pipeline_matches:
            return self.pipeline_matches[topic_name]
        return pipelines, []

    def resolve_source(self, semantic_model, measure):
        measure_name = self._read_name(measure)
        if measure_name in self.sources:
            return self.sources[measure_name]
        return semantic_model.node_relation.relation_name, "claim_id"

    def trace_upstream_routes(self, topic, factor, semantic_model, measure, tenant_id):
        topic_name = getattr(topic, "name", None)
        return self.upstream_routes.get(topic_name, [])

    @staticmethod
    def _read_name(instance):
        if isinstance(instance, dict):
            return instance.get("name")
        return getattr(instance, "name", None)


def _build_metric(
        name: str = "total_claim_cases", metric_type: MetricType = MetricType.SIMPLE,
        type_params: Optional[MetricTypeParams] = None
) -> MetricWithCategory:
    return MetricWithCategory(
        id=f"metric-{name}",
        name=name,
        label=name.replace("_", " ").title(),
        description=f"{name} description",
        type=metric_type,
        type_params=type_params or MetricTypeParams(
            measure=MeasureReference(name="count_claim_cases"),
            input_measures=[MeasureReference(name="count_claim_cases")]
        )
    )


def _build_semantic_model(
        name: str = "claims_semantic_model", measure_name: str = "count_claim_cases", expr: str = "claim_id",
        topic_id: Optional[str] = "topic-1", relation_name: str = "ods_claim.public.claim_header"
) -> SemanticModel:
    return SemanticModel(
        id=f"semantic-{name}",
        name=name,
        description=f"{name} description",
        node_relation=NodeRelation(
            alias=name,
            schema_name="public",
            database="ods_claim",
            relation_name=relation_name
        ),
        entities=[],
        measures=[Measure(name=measure_name, agg=AggregationType.COUNT, expr=expr)],
        dimensions=[],
        topicId=topic_id
    )


def _build_topic(
        name: str = "claims_topic", topic_id: str = "topic-1", factor_name: str = "claim_id",
        topic_type: TopicType = TopicType.DISTINCT
) -> Topic:
    return Topic(
        topicId=topic_id,
        name=name,
        type=topic_type,
        factors=[Factor(factorId=f"factor-{factor_name}", name=factor_name, label=factor_name.replace("_", " ").title())]
    )


def _build_pipeline(name: str = "claims_ingestion_pipeline", topic_id: str = "topic-1") -> Pipeline:
    return Pipeline(
        pipelineId=f"pipeline-{name}",
        topicId=topic_id,
        name=name,
        enabled=True,
        validated=True,
        stages=[]
    )


def _build_two_branch_loss_ratio_service() -> MetricLineageService:
    """Ratio metric with a partial numerator branch and a complete denominator branch."""
    metric = _build_metric(
        name="loss_ratio",
        metric_type=MetricType.RATIO,
        type_params=MetricTypeParams(
            numerator=MeasureReference(name="paid_amount"),
            denominator=MeasureReference(name="earned_premium")
        )
    )
    numerator_branch = MetricLineageBranch(
        id="primary-numerator",
        title="Numerator lineage",
        branchType="numerator",
        measureName="paid_amount",
        isPrimaryCandidate=True
    )
    denominator_branch = MetricLineageBranch(
        id="primary-denominator",
        title="Denominator lineage",
        branchType="denominator",
        measureName="earned_premium"
    )
    numerator_semantic = _build_semantic_model(
        name="claims_finance",
        measure_name="paid_amount",
        expr="paid_amount",
        topic_id=None,
        relation_name="finance.claims_paid"
    )
    denominator_semantic = _build_semantic_model(
        name="premium_finance",
        measure_name="earned_premium",
        expr="earned_premium",
        topic_id="topic-premium",
        relation_name="finance.earned_premium"
    )
    denominator_topic = _build_topic(
        name="premium_topic",
        topic_id="topic-premium",
        factor_name="earned_premium"
    )
    denominator_factor = denominator_topic.factors[0]
    denominator_pipeline = _build_pipeline(
        name="premium_pipeline",
        topic_id="topic-premium"
    )

    return MetricLineageService(
        _FakePrincipal(),
        resolver=_FakeResolver(
            metric,
            branches=[numerator_branch, denominator_branch],
            semantic_results={
                numerator_branch.id: (numerator_semantic, numerator_semantic.measures[0], []),
                denominator_branch.id: (denominator_semantic, denominator_semantic.measures[0], [])
            },
            topics={
                "claims_finance": None,
                "premium_finance": denominator_topic
            },
            factors={
                "paid_amount": None,
                "earned_premium": denominator_factor
            },
            pipelines={
                "premium_topic": [denominator_pipeline]
            },
            pipeline_matches={
                "premium_topic": ([denominator_pipeline], [])
            },
            sources={
                "paid_amount": (None, None),
                "earned_premium": ("finance.earned_premium", "earned_premium")
            }
        )
    )


class MetricLineageFlowTest(unittest.TestCase):
    def test_total_claim_cases_builds_resolved_path(self):
        metric = _build_metric()
        semantic_model = _build_semantic_model()
        measure = semantic_model.measures[0]
        topic = _build_topic()
        factor = topic.factors[0]
        pipeline = _build_pipeline()

        service = MetricLineageService(
            _FakePrincipal(),
            resolver=_FakeResolver(metric, semantic_model, measure, topic, factor, pipeline)
        )

        result = service.get_metric_lineage("total_claim_cases", "t-test")

        self.assertEqual("total_claim_cases", result.metricName)
        self.assertEqual("resolved", result.status)
        self.assertEqual("simple", result.summary.metricType)
        self.assertEqual(1, result.summary.semanticModelCount)
        self.assertEqual(1, result.summary.topicCount)
        self.assertEqual(1, result.summary.pipelineCount)
        self.assertEqual(1, result.summary.sourceFieldCount)
        self.assertEqual(1, len(result.paths))
        self.assertTrue(result.paths[0].isPrimary)

        node_ids = {node.id for node in result.nodes}
        self.assertIn("metric-total_claim_cases", node_ids)
        self.assertIn("semantic-claims_semantic_model", node_ids)
        self.assertIn("topic-claims_topic", node_ids)
        self.assertIn("pipeline-claims_ingestion_pipeline", node_ids)
        self.assertIn("source-field-ods_claim.public.claim_header-claim_id", node_ids)

    def test_total_claim_cases_accepts_dict_measure(self):
        metric = _build_metric()
        semantic_model = SemanticModel(
            id="s-1",
            name="claims_semantic_model",
            description="claims semantic",
            node_relation=NodeRelation(
                alias="topic_claims",
                schema_name="public",
                database="ods_claim",
                relation_name="ods_claim.public.claim_header"
            ),
            entities=[],
            measures=[],
            dimensions=[],
            topicId="topic-1"
        )
        measure = {
            "name": "count_claim_cases",
            "label": "Count Claim Cases",
            "description": "Counts claims",
            "expr": "claim_id",
            "agg": "count"
        }
        topic = _build_topic()
        factor = topic.factors[0]
        pipeline = _build_pipeline()

        service = MetricLineageService(
            _FakePrincipal(),
            resolver=_FakeResolver(metric, semantic_model, measure, topic, factor, pipeline)
        )

        result = service.get_metric_lineage("total_claim_cases", "t-test")

        self.assertEqual("resolved", result.status)
        node_ids = {node.id for node in result.nodes}
        self.assertIn("semantic-measure-claims_semantic_model-count_claim_cases", node_ids)

    def test_prefers_longer_complete_path_over_primary_candidate(self):
        metric = _build_metric(
            name="loss_ratio",
            metric_type=MetricType.RATIO,
            type_params=MetricTypeParams(
                numerator=MeasureReference(name="paid_amount"),
                denominator=MeasureReference(name="earned_premium")
            )
        )
        numerator_branch = MetricLineageBranch(
            id="primary-numerator",
            title="Numerator lineage",
            branchType="numerator",
            measureName="paid_amount",
            isPrimaryCandidate=True
        )
        denominator_branch = MetricLineageBranch(
            id="primary-denominator",
            title="Denominator lineage",
            branchType="denominator",
            measureName="earned_premium"
        )
        numerator_semantic = _build_semantic_model(
            name="claims_finance",
            measure_name="paid_amount",
            expr="paid_amount",
            topic_id=None,
            relation_name="finance.claims_paid"
        )
        denominator_semantic = _build_semantic_model(
            name="premium_finance",
            measure_name="earned_premium",
            expr="earned_premium",
            topic_id="topic-premium",
            relation_name="finance.earned_premium"
        )
        denominator_topic = _build_topic(
            name="premium_topic",
            topic_id="topic-premium",
            factor_name="earned_premium"
        )
        denominator_factor = denominator_topic.factors[0]
        denominator_pipeline = _build_pipeline(
            name="premium_pipeline",
            topic_id="topic-premium"
        )

        service = MetricLineageService(
            _FakePrincipal(),
            resolver=_FakeResolver(
                metric,
                branches=[numerator_branch, denominator_branch],
                semantic_results={
                    numerator_branch.id: (numerator_semantic, numerator_semantic.measures[0], []),
                    denominator_branch.id: (denominator_semantic, denominator_semantic.measures[0], [])
                },
                topics={
                    "claims_finance": None,
                    "premium_finance": denominator_topic
                },
                factors={
                    "paid_amount": None,
                    "earned_premium": denominator_factor
                },
                pipelines={
                    "premium_topic": [denominator_pipeline]
                },
                pipeline_matches={
                    "premium_topic": ([denominator_pipeline], [])
                },
                sources={
                    "paid_amount": (None, None),
                    "earned_premium": ("finance.earned_premium", "earned_premium")
                }
            )
        )

        result = service.get_metric_lineage("loss_ratio", "t-test")

        primary_paths = [path for path in result.paths if path.isPrimary]
        self.assertEqual(1, len(primary_paths))
        self.assertEqual("path-primary-denominator", primary_paths[0].id)
        self.assertEqual("resolved", result.status)

    def test_metric_ref_chain_stays_partial_when_semantic_missing(self):
        metric = _build_metric(
            name="claim_risk_score",
            metric_type=MetricType.DERIVED,
            type_params=MetricTypeParams(metrics=[MetricRef(name="female_insured_claims_count")])
        )
        branch = MetricLineageBranch(
            id="primary-ref-1",
            title="Reference lineage 1",
            branchType="metric_ref",
            metricRefName="female_insured_claims_count",
            metricRefChain=["female_insured_claims_count", "total_claim_cases"],
            isPrimaryCandidate=True
        )

        service = MetricLineageService(
            _FakePrincipal(),
            resolver=_FakeResolver(
                metric,
                branches=[branch],
                semantic_results={
                    branch.id: (
                        None,
                        None,
                        ["Semantic measure[total_claim_cases] was not found in semantic metadata."]
                    )
                }
            )
        )

        result = service.get_metric_lineage("claim_risk_score", "t-test")

        self.assertEqual("partial", result.status)
        self.assertEqual(["path-primary-ref-1"], [path.id for path in result.paths])
        self.assertTrue(result.paths[0].isPrimary)
        self.assertEqual(
            [
                "metric-claim_risk_score",
                "metric-ref-female_insured_claims_count",
                "metric-ref-total_claim_cases"
            ],
            result.paths[0].nodeIds
        )
        node_ids = {node.id for node in result.nodes}
        self.assertIn("metric-ref-female_insured_claims_count", node_ids)
        self.assertIn("metric-ref-total_claim_cases", node_ids)
        self.assertNotIn("semantic-total_claim_cases", node_ids)

    def test_multihop_upstream_routes_produce_raw_root_summary(self):
        metric = _build_metric()
        semantic_model = _build_semantic_model()
        measure = semantic_model.measures[0]
        serving_topic = _build_topic(name="serving_claim_topic", topic_id="topic-serving", factor_name="claim_id")
        serving_factor = serving_topic.factors[0]
        transform_pipeline = _build_pipeline(name="claim_enrichment_pipeline", topic_id="topic-curated")
        curated_topic = _build_topic(name="curated_claim_topic", topic_id="topic-curated", factor_name="claim_id")
        curated_factor = curated_topic.factors[0]
        raw_pipeline = _build_pipeline(name="raw_claim_standardize", topic_id="topic-raw")
        raw_topic = _build_topic(
            name="raw_claim_topic",
            topic_id="topic-raw",
            factor_name="claim_id",
            topic_type=TopicType.RAW
        )
        raw_factor = raw_topic.factors[0]

        service = MetricLineageService(
            _FakePrincipal(),
            resolver=_FakeResolver(
                metric,
                semantic_model=semantic_model,
                measure=measure,
                topic=serving_topic,
                factor=serving_factor,
                upstream_routes={
                    "serving_claim_topic": [
                        _FakeUpstreamTraceRoute(
                            id_suffix="claim-route",
                            title="Pipeline[claim_enrichment_pipeline] -> Raw topic[root]",
                            steps=[
                                _FakeUpstreamTraceStep(kind="pipeline", pipeline=transform_pipeline),
                                _FakeUpstreamTraceStep(kind="topic", topic=curated_topic),
                                _FakeUpstreamTraceStep(kind="topic_factor", topic=curated_topic, factor=curated_factor),
                                _FakeUpstreamTraceStep(kind="pipeline", pipeline=raw_pipeline),
                                _FakeUpstreamTraceStep(kind="topic", topic=raw_topic),
                                _FakeUpstreamTraceStep(kind="topic_factor", topic=raw_topic, factor=raw_factor)
                            ],
                            diagnostics=[]
                        )
                    ]
                }
            )
        )

        result = service.get_metric_lineage("total_claim_cases", "t-test")

        self.assertEqual("partial", result.status)
        self.assertEqual(1, result.summary.rawTopicCount)
        self.assertEqual(1, result.summary.routeCount)
        self.assertGreaterEqual(result.summary.maxHopDepth, 8)
        self.assertIsNotNone(result.routes)
        self.assertTrue(result.routes[0].reachesRawTopic)
        self.assertFalse(result.routes[0].reachesSource)
        self.assertIsNotNone(result.roots)
        self.assertIn("topic-raw_claim_topic", [root.nodeId for root in result.roots])
        self.assertEqual(
            [
                "metric-total_claim_cases",
                "semantic-claims_semantic_model",
                "semantic-measure-claims_semantic_model-count_claim_cases",
                "topic-serving_claim_topic",
                "topic-factor-serving_claim_topic-claim_id",
                "pipeline-claim_enrichment_pipeline",
                "topic-curated_claim_topic",
                "topic-factor-curated_claim_topic-claim_id",
                "pipeline-raw_claim_standardize",
                "topic-raw_claim_topic",
                "topic-factor-raw_claim_topic-claim_id"
            ],
            result.paths[0].nodeIds
        )


class MetricLineagePrunerTest(unittest.TestCase):
    @staticmethod
    def _build_fanout_view(field_count: int = 25) -> MetricLineageViewData:
        nodes = [
            LineageNode(id="metric-m", stage="metric", type="metric", name="m"),
            LineageNode(id="source-table-t", stage="source", type="source_table", name="t")
        ]
        edges = []
        for index in range(field_count):
            field_id = f"source-field-t-f{index:02d}"
            nodes.append(LineageNode(id=field_id, stage="source", type="source_field", name=f"f{index:02d}"))
            edges.append(LineageEdge(
                id=f"e{index}", **{"from": "source-table-t"}, to=field_id, kind="maps_to", pathId="path-1"
            ))
        paths = [LineagePath(
            id="path-1",
            title="Primary path",
            nodeIds=["metric-m", "source-table-t", "source-field-t-f07"],
            isPrimary=True
        )]
        return MetricLineageViewData(
            metricName="m",
            status="resolved",
            summary=MetricLineageSummary(),
            nodes=nodes,
            edges=edges,
            paths=paths
        )

    def test_fanout_limit_keeps_primary_path_field_and_counts_hidden(self):
        view = self._build_fanout_view(25)

        result = apply_fanout_limit(view, 20)

        field_node_ids = {node.id for node in result.nodes if node.type == "source_field"}
        self.assertEqual(20, len(field_node_ids))
        self.assertIn("source-field-t-f07", field_node_ids)
        table_node = next(node for node in result.nodes if node.id == "source-table-t")
        self.assertEqual(5, table_node.metadata["hiddenFieldCount"])
        self.assertEqual(20, len(result.edges))
        self.assertEqual(
            ["metric-m", "source-table-t", "source-field-t-f07"],
            result.paths[0].nodeIds
        )

    def test_fanout_limit_leaves_small_fanout_untouched(self):
        view = self._build_fanout_view(3)

        result = apply_fanout_limit(view, 20)

        self.assertIs(result, view)


class MetricLineageOnDemandTest(unittest.TestCase):
    def test_default_request_returns_primary_path_and_summaries(self):
        service = _build_two_branch_loss_ratio_service()

        result = service.get_metric_lineage("loss_ratio", "t-test")

        self.assertEqual(["path-primary-denominator"], [path.id for path in result.paths])
        self.assertIsNotNone(result.pathSummaries)
        self.assertEqual(["path-primary-numerator"], [summary.id for summary in result.pathSummaries])
        self.assertEqual(3, result.pathSummaries[0].nodeCount)
        node_ids = {node.id for node in result.nodes}
        self.assertIn("source-field-finance.earned_premium-earned_premium", node_ids)
        self.assertNotIn("semantic-claims_finance", node_ids)
        self.assertFalse(result.truncated)

    def test_path_id_request_returns_requested_path_detail(self):
        service = _build_two_branch_loss_ratio_service()

        result = service.get_metric_lineage("loss_ratio", "t-test", path_id="path-primary-numerator")

        self.assertEqual(
            ["path-primary-denominator", "path-primary-numerator"],
            sorted(path.id for path in result.paths)
        )
        self.assertIsNone(result.pathSummaries)
        node_ids = {node.id for node in result.nodes}
        self.assertIn("semantic-claims_finance", node_ids)
        self.assertIn("semantic-measure-claims_finance-paid_amount", node_ids)
        numerator_path = next(path for path in result.paths if path.id == "path-primary-numerator")
        self.assertEqual(3, len(numerator_path.nodeIds))

    def test_max_nodes_truncates_but_keeps_primary_path(self):
        service = _build_two_branch_loss_ratio_service()

        result = service.get_metric_lineage("loss_ratio", "t-test", path_id="path-primary-numerator", max_nodes=6)

        self.assertTrue(result.truncated)
        self.assertEqual(10, result.totalNodeCount)
        primary_path = next(path for path in result.paths if path.isPrimary)
        self.assertEqual("path-primary-denominator", primary_path.id)
        node_ids = {node.id for node in result.nodes}
        self.assertEqual(set(primary_path.nodeIds), node_ids)
        self.assertIn("source-field-finance.earned_premium-earned_premium", node_ids)
        self.assertNotIn("semantic-claims_finance", node_ids)
        numerator_path = next(path for path in result.paths if path.id == "path-primary-numerator")
        self.assertEqual(["metric-loss_ratio"], numerator_path.nodeIds)


if __name__ == "__main__":
    unittest.main()
