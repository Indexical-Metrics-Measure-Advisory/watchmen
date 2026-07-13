import sys
import unittest
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))


from watchmen_metricflow.ontology.factor_mask_policy import mask_value
from watchmen_metricflow.ontology.factor_type_resolver import ResolvedFactor
from watchmen_metricflow.ontology.security_layer import OntologySecurityLayer
from watchmen_model.admin import (
    Factor,
    FactorEncryptMethod,
    FactorType,
    PhysicalTableMapping,
    Topic,
    VirtualObject,
    VirtualObjectAttribute,
    VirtualOntology,
)
from watchmen_model.admin.topic import TopicType
from watchmen_model.admin import UserRole


# --------------------------------------------------------------------------- #
# Fakes
# --------------------------------------------------------------------------- #

class _FakePrincipal:
    def __init__(self, roles: Optional[List[str]] = None, tenant_id: str = 't-test') -> None:
        self.userId = 'u-test'
        self.tenantId = tenant_id
        self.roles = roles or []

    def get_tenant_id(self) -> str:
        return self.tenantId


class _FakeResolver:
    """Bypasses TopicService and feeds pre-set ResolvedFactors directly."""

    def __init__(self, mapping: Dict[str, ResolvedFactor]) -> None:
        self._mapping = mapping

    def resolve_attributes(self, virtual_object: VirtualObject) -> Dict[str, ResolvedFactor]:
        return {name: self._mapping[name] for name in self._mapping if any(a.name == name for a in virtual_object.attributes or [])}


def _make_factor(name: str, factor_type: Optional[FactorType], encrypt: Optional[FactorEncryptMethod] = None) -> Factor:
    return Factor(factorId=f'fid-{name}', name=name, type=factor_type, encrypt=encrypt)


def _make_topic(name: str, factors: List[Factor]) -> Topic:
    return Topic(topicId=f'tid-{name}', name=name, type=TopicType.DISTINCT, factors=factors)


def _make_virtual_object(attrs: List[Dict[str, str]]) -> VirtualObject:
    return VirtualObject(
        id='vo1', name='policy_holder',
        physicalTables=[PhysicalTableMapping(topicName='dm_policy_contract', alias='c', kind='primary', fields=['id'])],
        attributes=[VirtualObjectAttribute(name=a['name'], sourceTable=a.get('source', 'c'), sourceField=a.get('field', a['name'])) for a in attrs],
    )


def _make_ontology(tags: Optional[List[str]] = None) -> VirtualOntology:
    return VirtualOntology(ontologyId='o1', name='ins', tags=tags or [])


# --------------------------------------------------------------------------- #
# mask_value algorithm unit tests
# --------------------------------------------------------------------------- #

class TestMaskValue(unittest.TestCase):
    def test_none_and_empty_passthrough(self):
        self.assertIsNone(mask_value(None, FactorEncryptMethod.MASK_MAIL))
        self.assertEqual('', mask_value('', FactorEncryptMethod.MASK_MAIL))

    def test_aes_md5_sha256_passthrough(self):
        # write side already persisted as ciphertext/hash; no display-side processing
        self.assertEqual('{AES}abc', mask_value('{AES}abc', FactorEncryptMethod.AES256_PKCS5_PADDING))
        self.assertEqual('deadbeef', mask_value('deadbeef', FactorEncryptMethod.MD5))
        self.assertEqual('deadbeef', mask_value('deadbeef', FactorEncryptMethod.SHA256))

    def test_none_method_passthrough(self):
        self.assertEqual('abc', mask_value('abc', None))
        self.assertEqual('abc', mask_value('abc', FactorEncryptMethod.NONE))

    def test_mask_mail(self):
        self.assertEqual('*****@example.com', mask_value('alice@example.com', FactorEncryptMethod.MASK_MAIL))
        # no @ -> returned unchanged
        self.assertEqual('notanemail', mask_value('notanemail', FactorEncryptMethod.MASK_MAIL))

    def test_mask_center_5_on_mobile(self):
        # 11-digit mobile 13812345678 (single numeric segment) -> mask first 5 digits
        self.assertEqual('*****345678', mask_value('13812345678', FactorEncryptMethod.MASK_CENTER_5))

    def test_mask_last_6_on_id_no(self):
        # 18-digit ID (all digits) -> mask last 6 numeric characters
        self.assertEqual('110101199001******', mask_value('110101199001011234', FactorEncryptMethod.MASK_LAST_6))

    def test_mask_month_day_on_date_string(self):
        masked = mask_value('1990-05-20', FactorEncryptMethod.MASK_MONTH_DAY)
        self.assertEqual('1990-01-01', masked)

    def test_unknown_method_passthrough(self):
        # unknown method (should not occur in practice; method comes from the
        # FactorEncryptMethod enum) -> pass through safely, no error, no guessed mask
        result = mask_value('abcdef', 'unknown-method')  # type: ignore[arg-type]
        self.assertEqual('abcdef', result)


# --------------------------------------------------------------------------- #
# OntologySecurityLayer decision logic
# --------------------------------------------------------------------------- #

class TestSecurityLayerDecisions(unittest.TestCase):
    def _layer(self, resolver: Optional[_FakeResolver] = None, roles: Optional[List[str]] = None) -> OntologySecurityLayer:
        return OntologySecurityLayer(_FakePrincipal(roles=roles), topic_resolver=resolver)

    def test_admin_passthrough(self):
        rows = [{'email': 'alice@example.com', 'id_no': '110101199001011234'}]
        layer = self._layer(resolver=_FakeResolver({}), roles=[UserRole.ADMIN])
        vo = _make_virtual_object([{'name': 'email', 'field': 'email'}, {'name': 'id_no', 'field': 'id_no'}])
        out = layer.mask_rows(_make_ontology(), vo, rows, _FakePrincipal(roles=[UserRole.ADMIN]))
        self.assertEqual(out, rows)

    def test_type_driven_masking_email_mobile_idno(self):
        resolver = _FakeResolver({
            'email': ResolvedFactor(FactorType.EMAIL, None, resolved=True),
            'mobile': ResolvedFactor(FactorType.MOBILE, None, resolved=True),
            'id_no': ResolvedFactor(FactorType.ID_NO, None, resolved=True),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([
            {'name': 'email', 'field': 'email'},
            {'name': 'mobile', 'field': 'mobile'},
            {'name': 'id_no', 'field': 'id_no'},
        ])
        rows = [{'email': 'alice@example.com', 'mobile': '13812345678', 'id_no': '110101199001011234'}]
        out = layer.mask_rows(_make_ontology(), vo, rows, _FakePrincipal())[0]
        self.assertEqual('*****@example.com', out['email'])
        # MOBILE default MASK_CENTER_5, single numeric segment -> mask first 5 digits
        self.assertEqual('*****345678', out['mobile'])
        # ID_NO default MASK_LAST_6, mask last 6 numeric characters
        self.assertEqual('110101199001******', out['id_no'])

    def test_encrypt_overrides_type_default(self):
        # explicit factor.encrypt overrides the type default algorithm
        resolver = _FakeResolver({
            'mobile': ResolvedFactor(FactorType.MOBILE, FactorEncryptMethod.MASK_LAST_3, resolved=True),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([{'name': 'mobile', 'field': 'mobile'}])
        rows = [{'mobile': '13812345678'}]
        out = layer.mask_rows(_make_ontology(), vo, rows, _FakePrincipal())[0]
        # MASK_LAST_3 -> mask last 3 numeric characters
        self.assertEqual('13812345***', out['mobile'])

    def test_non_sensitive_type_not_masked_even_if_name_matches(self):
        # NUMBER type with encrypt not configured -> not masked (even if the
        # field name contains keywords like 'name', it is no longer masked)
        resolver = _FakeResolver({
            'customer_name': ResolvedFactor(FactorType.TEXT, None, resolved=True),
            'age': ResolvedFactor(FactorType.NUMBER, None, resolved=True),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([
            {'name': 'customer_name', 'field': 'customer_name'},
            {'name': 'age', 'field': 'age'},
        ])
        rows = [{'customer_name': 'Alice', 'age': 30}]
        out = layer.mask_rows(_make_ontology(tags=['PII']), vo, rows, _FakePrincipal())[0]
        self.assertEqual('Alice', out['customer_name'])
        self.assertEqual(30, out['age'])

    def test_encrypt_none_treated_as_not_configured(self):
        # encrypt=NONE is equivalent to not configured -> use type fallback
        resolver = _FakeResolver({
            'email': ResolvedFactor(FactorType.EMAIL, FactorEncryptMethod.NONE, resolved=True),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([{'name': 'email', 'field': 'email'}])
        rows = [{'email': 'alice@example.com'}]
        out = layer.mask_rows(_make_ontology(), vo, rows, _FakePrincipal())[0]
        self.assertEqual('*****@example.com', out['email'])

    def test_unresolved_falls_back_to_name_heuristic(self):
        # resolution failed (resolved=False) -> name heuristic + generic fallback
        resolver = _FakeResolver({
            'email': ResolvedFactor(None, None, resolved=False),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([{'name': 'email', 'field': 'email'}])
        rows = [{'email': 'alice@example.com'}]
        out = layer.mask_rows(_make_ontology(tags=['PII']), vo, rows, _FakePrincipal())[0]
        # generic fallback: first + stars + last
        self.assertEqual('a***************m', out['email'])

    def test_no_resolver_falls_back_to_name_heuristic(self):
        # no resolver at all (topic_service not injected) -> name heuristic
        layer = self._layer(resolver=None)
        vo = _make_virtual_object([{'name': 'phone_number', 'field': 'phone_number'}])
        rows = [{'phone_number': '13812345678'}]
        out = layer.mask_rows(_make_ontology(tags=['PII']), vo, rows, _FakePrincipal())[0]
        self.assertEqual('1*********8', out['phone_number'])

    def test_none_value_passthrough(self):
        resolver = _FakeResolver({
            'email': ResolvedFactor(FactorType.EMAIL, None, resolved=True),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([{'name': 'email', 'field': 'email'}])
        rows = [{'email': None}]
        out = layer.mask_rows(_make_ontology(), vo, rows, _FakePrincipal())[0]
        self.assertIsNone(out['email'])

    def test_dob_type_masked(self):
        resolver = _FakeResolver({
            'birth_date': ResolvedFactor(FactorType.DATE_OF_BIRTH, None, resolved=True),
        })
        layer = self._layer(resolver=resolver)
        vo = _make_virtual_object([{'name': 'birth_date', 'field': 'birth_date'}])
        rows = [{'birth_date': '1990-05-20'}]
        out = layer.mask_rows(_make_ontology(), vo, rows, _FakePrincipal())[0]
        self.assertEqual('1990-01-01', out['birth_date'])


if __name__ == '__main__':
    unittest.main()
