"""Agent-view YAML conversion for virtual ontologies (no internal IDs, business names only).

Extracted from ontology_router to keep the router endpoint-thin. The linked space is
exposed as its business name: export resolves spaceId -> name (lenient), import resolves
name -> spaceId (exact match within the tenant, lenient).
"""

from typing import Any, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import OntologyService
from watchmen_model.admin import (
	DerivedAttribute, OntologySensitivity, VirtualLink, VirtualObject, VirtualOntology
)
from watchmen_utilities import ArrayHelper

from watchmen_metricflow.ontology.space_scope import OntologySpaceScope


def ontology_to_agent_yaml(
	ontology: VirtualOntology,
	space_scope: Optional[OntologySpaceScope] = None,
) -> Dict[str, Any]:
	"""Convert full VirtualOntology to agent-view YAML dict (strip IDs)."""
	obj_by_id: Dict[str, str] = {}
	link_by_id: Dict[str, str] = {}
	for vo in (ontology.virtualObjects or []):
		if vo.id:
			obj_by_id[vo.id] = vo.name or ''
	for vl in (ontology.virtualLinks or []):
		if vl.id:
			link_by_id[vl.id] = vl.name or ''

	# resolve linked space id to its business name; None when unset or not found
	space_name = space_scope.find_linked_space_name(ontology) if space_scope is not None else None

	def _resolve_path_token(idx: int, token: str) -> str:
		# even index -> object id, odd index -> link id
		if idx % 2 == 0:
			return obj_by_id.get(token, token)
		return link_by_id.get(token, token)

	return {
		'name': ontology.name,
		'space': space_name,
		'description': ontology.description,
		'owner': ontology.owner,
		'technicalOwner': ontology.technicalOwner,
		'tags': ontology.tags or [],
		'sensitivity': ontology.sensitivity.value if ontology.sensitivity else 'internal',
		'virtualObjects': ArrayHelper(ontology.virtualObjects).map(lambda vo: {
			'name': vo.name,
			'description': vo.description,
			'icon': vo.icon,
			'color': vo.color,
			'physicalTables': ArrayHelper(vo.physicalTables).map(lambda pt: {
				'topicName': pt.topicName,
				# 关键：必须输出 `kind`（SQL 编译和 UI 都依赖此字段）。
				# 旧版本误用了 model 中不存在的 `pt.role`（会抛 AttributeError 或输出 null），
				# 导致 roundtrip 后所有 primary 都退化为 detail，详见 bug #ontology-yaml-kind-loss。
				'kind': pt.kind,
				'joinType': pt.joinType,
				'alias': pt.alias,
				'fields': pt.fields or [],
				'joinConditions': ArrayHelper(pt.joinConditions or []).map(lambda jc: {
					'sourceField': jc.sourceField,
					'targetField': jc.targetField,
				}).to_list(),
				'filters': ArrayHelper(pt.filters or []).map(lambda f: {
					'field': f.field,
					'operator': f.operator,
					'value': f.value,
				}).to_list(),
			}).to_list(),
			'attributes': ArrayHelper(vo.attributes).map(lambda a: {
				'name': a.name,
				'sourceTable': a.sourceTable,
				'sourceField': a.sourceField,
			}).to_list(),
			'derivedAttributes': ArrayHelper(vo.derivedAttributes).map(lambda da: {
				'name': da.name,
				'description': da.description,
				'aggregate': da.aggregate,
				'path': [_resolve_path_token(i, t) for i, t in enumerate(da.path or [])],
				'targetField': da.targetField,
			}).to_list(),
		}).to_list(),
		'virtualLinks': ArrayHelper(ontology.virtualLinks).map(lambda vl: {
			'name': vl.name,
			'sourceObjectName': obj_by_id.get(vl.sourceObjectId, ''),
			'targetObjectName': obj_by_id.get(vl.targetObjectId, ''),
			'joinType': vl.joinType,
			'joinConditions': ArrayHelper(vl.joinConditions).map(lambda jc: {
				'sourceField': jc.sourceField,
				'targetField': jc.targetField,
			}).to_list(),
			'filters': ArrayHelper(vl.filters).map(lambda f: {
				'field': f.field,
				'operator': f.operator,
				'value': f.value,
			}).to_list(),
			'description': vl.description,
		}).to_list(),
	}


def agent_yaml_to_ontology(
	yaml_data: Dict[str, Any],
	existing: Optional[VirtualOntology],
	service: OntologyService,
	space_scope: OntologySpaceScope,
	principal_service: PrincipalService,
) -> VirtualOntology:
	"""Convert agent-view YAML dict to full VirtualOntology model, reusing IDs from existing."""
	tenant_id = principal_service.get_tenant_id()

	if existing:
		ontology = existing
		existing_obj_by_name = {vo.name: vo for vo in (ontology.virtualObjects or [])}
		existing_link_by_name = {vl.name: vl for vl in (ontology.virtualLinks or [])}
	else:
		ontology = VirtualOntology(
			ontologyId=str(service.snowflakeGenerator.next_id()),
			tenantId=tenant_id,
		)
		existing_obj_by_name = {}
		existing_link_by_name = {}

	ontology.name = yaml_data.get('name', '')
	ontology.description = yaml_data.get('description', '')
	ontology.owner = yaml_data.get('owner', '')
	ontology.technicalOwner = yaml_data.get('technicalOwner', '')
	ontology.tags = yaml_data.get('tags', [])
	sensitivity_raw = yaml_data.get('sensitivity', 'internal')
	ontology.sensitivity = sensitivity_raw if isinstance(sensitivity_raw, OntologySensitivity) else OntologySensitivity(sensitivity_raw)

	# resolve space business name back to spaceId; keep None when blank or not found (lenient agent channel)
	ontology.spaceId = space_scope.resolve_space_id_by_name(yaml_data.get('space'))

	# ---- virtual objects ----
	objects: List[VirtualObject] = []
	for vo_data in (yaml_data.get('virtualObjects') or []):
		vo_name = vo_data.get('name', '')
		existing_vo = existing_obj_by_name.get(vo_name)
		obj_id = existing_vo.id if existing_vo and existing_vo.id else f'vo-{service.snowflakeGenerator.next_id()}'
		objects.append(VirtualObject(
			id=obj_id,
			name=vo_name,
			description=vo_data.get('description', ''),
			icon=vo_data.get('icon'),
			color=vo_data.get('color'),
			physicalTables=vo_data.get('physicalTables', []),
			attributes=vo_data.get('attributes', []),
			derivedAttributes=_resolve_derived_ids(
				vo_data.get('derivedAttributes', []),
				obj_id,
				obj_by_name={vo.name: vo.id for vo in objects if vo.name},
				link_by_name={},
			),
		))
	ontology.virtualObjects = objects

	# ---- virtual links (resolve object names to IDs) ----
	obj_by_name = {vo.name: vo.id for vo in objects if vo.name}
	links: List[VirtualLink] = []
	for vl_data in (yaml_data.get('virtualLinks') or []):
		vl_name = vl_data.get('name', '')
		existing_vl = existing_link_by_name.get(vl_name)
		link_id = existing_vl.id if existing_vl and existing_vl.id else f'vl-{service.snowflakeGenerator.next_id()}'
		links.append(VirtualLink(
			id=link_id,
			name=vl_name,
			sourceObjectId=obj_by_name.get(vl_data.get('sourceObjectName', ''), ''),
			targetObjectId=obj_by_name.get(vl_data.get('targetObjectName', ''), ''),
			joinType=vl_data.get('joinType', 'inner'),
			joinConditions=vl_data.get('joinConditions', []),
			filters=vl_data.get('filters', []),
			description=vl_data.get('description'),
		))
	ontology.virtualLinks = links

	# ---- resolve derived path names back to IDs (after links are built) ----
	link_by_name = {vl.name: vl.id for vl in links if vl.name}
	obj_ids = set(obj_by_name.values())
	link_ids = set(link_by_name.values())
	for vo in ontology.virtualObjects or []:
		for da in (vo.derivedAttributes or []):
			resolved_path = []
			for idx, token in enumerate(da.path or []):
				if not token:
					resolved_path.append(token)
					continue
				# even index -> object name/id, odd index -> link name/id
				lookup = obj_by_name if idx % 2 == 0 else link_by_name
				known_ids = obj_ids if idx % 2 == 0 else link_ids
				if token in lookup:
					resolved_path.append(lookup[token])
				elif token in known_ids:
					# already an ID, keep as-is
					resolved_path.append(token)
				else:
					# unknown token, keep as-is (validation will catch it later)
					resolved_path.append(token)
			da.path = resolved_path

	return ontology


def _resolve_derived_ids(
	derived_list: List[Dict[str, Any]],
	obj_id: str,
	obj_by_name: Dict[str, str],
	link_by_name: Dict[str, str],
) -> List[DerivedAttribute]:
	"""Ensure derived attributes carry objectId. Path token resolution is done in a
	second pass in agent_yaml_to_ontology once all virtual objects and links are built."""
	results = []
	for da_data in derived_list:
		da_copy = dict(da_data)
		da_copy['objectId'] = obj_id
		results.append(da_copy)
	return results
