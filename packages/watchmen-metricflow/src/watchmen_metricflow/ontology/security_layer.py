"""Data security layer: field-level masking driven by FactorType / FactorEncryptMethod.

Decision priority (per attribute):
1. **encrypt first** -- if the underlying Factor was resolved and
   ``factor.encrypt`` is non-empty and != ``NONE``, mask using that
   ``FactorEncryptMethod`` and treat the field as sensitive.
2. **type fallback** -- if encrypt is not configured but
   ``factor.type ∈ SENSITIVE_FACTOR_TYPES``, mask using
   ``DEFAULT_MASK_FOR_TYPE[type]``.
3. **legacy name heuristic** -- when the underlying Factor cannot be resolved
   (Topic/Factor missing, or TopicService not injected), preserve the legacy
   behavior: ontology.tags hits PII and the attribute name contains a common
   sensitive keyword, or the attribute name itself contains ``pii``/``sensitive``.
   Mask shape uses the generic ``first+stars+last``.
4. Non-sensitive type (NUMBER / TEXT / DATE / ...) with encrypt not configured
   -> not masked.

Admin users always pass through with no masking.
"""

from typing import Any, Dict, List, Optional, Set, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.admin import FactorEncryptMethod, UserRole, VirtualObject, VirtualOntology

from .factor_mask_policy import (
	default_method_for_type,
	is_sensitive_type,
	mask_value as mask_value_by_method,
)
from .factor_type_resolver import FactorTypeResolver, ResolvedFactor


class OntologySecurityError(Exception):
	"""Data security validation failure."""


class OntologySecurityLayer:
	"""Identifies sensitive fields and applies field-level masking for non-admin users."""

	PII_TAGS = {'PII', 'PII Sensitive', 'Sensitive', 'sensitive', 'pii'}
	# Common sensitive keywords used by the legacy name heuristic
	# (only used when factor metadata is unavailable)
	LEGACY_SENSITIVE_KEYWORDS = ('name', 'email', 'phone', 'mobile', 'id_no', 'identity', 'address')

	def __init__(
			self,
			principal_service: PrincipalService,
			topic_resolver: Optional[FactorTypeResolver] = None,
	) -> None:
		self.principal_service = principal_service
		self.topic_resolver = topic_resolver

	def mask_rows(
			self,
			ontology: VirtualOntology,
			virtual_object: VirtualObject,
			rows: List[Dict[str, Any]],
			principal_service: PrincipalService,
	) -> List[Dict[str, Any]]:
		if self._is_admin(principal_service):
			return rows
		# Split fields into two groups by method:
		# - method_fields: fields with a concrete FactorEncryptMethod
		# - generic_fields: only matched by the name heuristic, no concrete
		#   algorithm; use the generic first+stars+last fallback
		method_fields, generic_fields = self._resolve_field_methods(ontology, virtual_object)
		if not method_fields and not generic_fields:
			return rows
		masked = []
		for row in rows:
			new_row = dict(row)
			for field, method in method_fields.items():
				if field in new_row:
					new_row[field] = mask_value_by_method(new_row[field], method)
			for field in generic_fields:
				if field in new_row:
					new_row[field] = _mask_generic(new_row[field])
			masked.append(new_row)
		return masked

	def _is_admin(self, principal_service: PrincipalService) -> bool:
		principal = getattr(principal_service, 'principal', None)
		roles = getattr(principal, 'roles', None) or []
		return UserRole.ADMIN in roles or 'admin' in roles or 'ADMIN' in roles

	def _resolve_field_methods(
			self, ontology: VirtualOntology, virtual_object: VirtualObject,
	) -> Tuple[Dict[str, FactorEncryptMethod], Set[str]]:
		"""Returns (fields masked by method, fields using the generic fallback only)."""
		resolved: Dict[str, ResolvedFactor] = (
			self.topic_resolver.resolve_attributes(virtual_object)
			if self.topic_resolver is not None else {}
		)
		ontology_tags = set(ontology.tags or [])
		pii_enabled = bool(ontology_tags.intersection(self.PII_TAGS))

		method_fields: Dict[str, FactorEncryptMethod] = {}
		generic_fields: Set[str] = set()
		for attr in virtual_object.attributes or []:
			name = attr.name or ''
			if not name:
				continue
			method, kind = self._classify_attribute(name, resolved.get(name), pii_enabled)
			if kind == 'method' and method is not None:
				method_fields[name] = method
			elif kind == 'generic':
				generic_fields.add(name)
			# kind == 'none' -> not masked
		return method_fields, generic_fields

	def _classify_attribute(
			self,
			attr_name: str,
			resolved: Optional[ResolvedFactor],
			pii_enabled: bool,
	) -> Tuple[Optional[FactorEncryptMethod], str]:
		"""Returns (method, kind). kind ∈ {'method', 'generic', 'none'}.

		- 'method': has a concrete FactorEncryptMethod; caller masks by method.
		- 'generic': only matched by the name heuristic; caller uses the generic
		  first+stars+last fallback.
		- 'none': not sensitive, not masked.
		"""
		# 1) underlying Factor resolved: encrypt first, type fallback
		if resolved is not None and resolved.resolved:
			if resolved.encrypt is not None and resolved.encrypt != FactorEncryptMethod.NONE:
				return resolved.encrypt, 'method'
			if is_sensitive_type(resolved.factor_type):
				return default_method_for_type(resolved.factor_type), 'method'
			# non-sensitive type with encrypt not configured -> not masked
			return None, 'none'

		# 2) legacy name heuristic (only when factor metadata is unavailable)
		lower = attr_name.lower()
		if (pii_enabled and any(kw in lower for kw in self.LEGACY_SENSITIVE_KEYWORDS)) \
				or any(kw in lower for kw in ('pii', 'sensitive')):
			return None, 'generic'
		return None, 'none'


def _mask_generic(value: Any) -> Any:
	"""Generic fallback mask: keep first and last, replace the middle with ``*``.
	Consistent with the original security_layer behavior."""
	if value is None:
		return None
	text = str(value)
	if len(text) <= 1:
		return '*'
	if len(text) == 2:
		return text[0] + '*'
	return text[0] + ('*' * (len(text) - 2)) + text[-1]
