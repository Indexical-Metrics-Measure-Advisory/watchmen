"""数据安全层：基于现有角色做 PII 脱敏。"""

from typing import Any, Dict, List, Set

from watchmen_auth import PrincipalService
from watchmen_model.admin import UserRole, VirtualObject, VirtualOntology


class OntologySecurityError(Exception):
	"""数据安全校验失败。"""


class OntologySecurityLayer:
	"""识别敏感标签并对非管理员用户做字段级脱敏。"""

	PII_TAGS = {'PII', 'PII Sensitive', 'Sensitive', 'sensitive', 'pii'}

	def mask_rows(
			self,
			ontology: VirtualOntology,
			virtual_object: VirtualObject,
			rows: List[Dict[str, Any]],
			principal_service: PrincipalService,
	) -> List[Dict[str, Any]]:
		if self._is_admin(principal_service):
			return rows
		sensitive_fields = self._find_sensitive_fields(ontology, virtual_object)
		if not sensitive_fields:
			return rows
		masked = []
		for row in rows:
			new_row = dict(row)
			for field in sensitive_fields:
				if field in new_row:
					new_row[field] = self._mask_value(new_row[field])
			masked.append(new_row)
		return masked

	def _is_admin(self, principal_service: PrincipalService) -> bool:
		principal = getattr(principal_service, 'principal', None)
		roles = getattr(principal, 'roles', None) or []
		return UserRole.ADMIN in roles or 'admin' in roles or 'ADMIN' in roles

	def _find_sensitive_fields(self, ontology: VirtualOntology, virtual_object: VirtualObject) -> Set[str]:
		# MVP：字段级敏感标记暂未存在于 model，先支持两类：
		# 1. ontology.tags 中包含 PII，则按常见字段名脱敏；
		# 2. attribute.name 自身命中敏感关键词则脱敏。
		ontology_tags = set(ontology.tags or [])
		pii_enabled = bool(ontology_tags.intersection(self.PII_TAGS))
		sensitive_keywords = ('name', 'email', 'phone', 'mobile', 'id_no', 'identity', 'address')
		fields: Set[str] = set()
		for attr in virtual_object.attributes or []:
			attr_name = (attr.name or '').lower()
			if pii_enabled and any(keyword in attr_name for keyword in sensitive_keywords):
				fields.add(attr.name)
			elif any(keyword in attr_name for keyword in ('pii', 'sensitive')):
				fields.add(attr.name)
		return fields

	def _mask_value(self, value: Any) -> Any:
		if value is None:
			return None
		text = str(value)
		if len(text) <= 1:
			return '*'
		if len(text) == 2:
			return text[0] + '*'
		return text[0] + ('*' * (len(text) - 2)) + text[-1]
