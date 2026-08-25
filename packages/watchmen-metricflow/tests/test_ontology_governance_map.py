"""Storage-free unit tests for the ontology governance map projection.

Topic / PII term / monitor rule queries are stubbed; no meta storage involved.
"""
import os
import sys
import unittest
from pathlib import Path
from typing import Dict, List, Optional

# Keep the snowflake generator from touching a real meta storage on import.
os.environ.setdefault('SNOWFLAKE_COMPETITIVE_WORKERS', 'false')

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / 'src'
if str(SRC_ROOT) not in sys.path:
	sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
	src_dir = package_dir / 'src'
	if src_dir.exists() and str(src_dir) not in sys.path:
		sys.path.insert(0, str(src_dir))

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
from watchmen_model.dqc import MonitorRule, MonitorRuleCode, MonitorRuleGrade, MonitorRuleSeverity

from watchmen_metricflow.meta.pii_term_meta_reader import LinkedFactorRef, PIITermRef
from watchmen_metricflow.ontology.governance_service import OntologyGovernanceService

TENANT_ID = 't-test'


# --------------------------------------------------------------------------- #
# Fakes
# --------------------------------------------------------------------------- #

class _FakePrincipal:
	def __init__(self, tenant_id: str = TENANT_ID) -> None:
		self.tenantId = tenant_id

	def get_tenant_id(self) -> str:
		return self.tenantId


class _FakeTopicService:
	def __init__(self, topics: List[Topic]) -> None:
		self._by_name = {t.name: t for t in topics}
		self._by_id = {t.topicId: t for t in topics}

	def find_by_name_and_tenant(self, name: str, tenant_id: str) -> Optional[Topic]:
		return self._by_name.get(name)

	def find_by_id(self, topic_id: str) -> Optional[Topic]:
		return self._by_id.get(topic_id)


class _FakePIITermReader:
	def __init__(self, terms: List[PIITermRef]) -> None:
		self._terms = terms

	def find_all_for_tenant(self, tenant_id: str) -> List[PIITermRef]:
		return self._terms


class _FakeMonitorRuleService:
	def __init__(self, rules: List[MonitorRule]) -> None:
		self._rules = rules

	def find_by_grade_or_topic_id(self, grade, topic_id, tenant_id) -> List[MonitorRule]:
		return [
			r for r in self._rules
			if (grade is None or r.grade == grade) and (topic_id is None or str(r.topicId) == str(topic_id))
		]

	def find_by_topic_id(self, topic_id, tenant_id) -> List[MonitorRule]:
		return [r for r in self._rules if r.topicId is not None and str(r.topicId) == str(topic_id)]


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #

def _make_factor(
		name: str,
		factor_type: Optional[FactorType] = FactorType.TEXT,
		encrypt: Optional[FactorEncryptMethod] = None,
		label: Optional[str] = None,
) -> Factor:
	return Factor(factorId=f'fid-{name}', name=name, type=factor_type, encrypt=encrypt, label=label)


def _make_topic(name: str, factors: List[Factor], topic_id: Optional[str] = None) -> Topic:
	return Topic(topicId=topic_id or f'tid-{name}', name=name, type=TopicType.DISTINCT, factors=factors)


def _make_ontology(attrs: List[VirtualObjectAttribute], mapping: Optional[PhysicalTableMapping] = None) -> VirtualOntology:
	return VirtualOntology(
		ontologyId='o1', name='ins',
		virtualObjects=[VirtualObject(
			id='vo1', name='policy_holder',
			physicalTables=[mapping or PhysicalTableMapping(
				topicId='tid-dm_policy_contract', topicName='dm_policy_contract', alias='c', kind='primary')],
			attributes=attrs,
		)],
	)


def _make_rule(
		rule_id: str,
		grade: MonitorRuleGrade,
		topic_id: Optional[str] = None,
		factor_id: Optional[str] = None,
		enabled: bool = True,
) -> MonitorRule:
	return MonitorRule(
		ruleId=rule_id, code=MonitorRuleCode.FACTOR_IS_EMPTY, grade=grade,
		severity=MonitorRuleSeverity.WARN, topicId=topic_id, factorId=factor_id, enabled=enabled)


def _build_service(
		topics: List[Topic],
		terms: Optional[List[PIITermRef]] = None,
		rules: Optional[List[MonitorRule]] = None,
) -> OntologyGovernanceService:
	return OntologyGovernanceService(
		topic_service=_FakeTopicService(topics),
		monitor_rule_service=_FakeMonitorRuleService(rules or []),
		pii_term_reader=_FakePIITermReader(terms or []),
		principal_service=_FakePrincipal(),
	)


# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #

class GovernanceMapTest(unittest.TestCase):
	def test_attribute_resolution_and_pii_confirmed_vs_pending(self) -> None:
		topic = _make_topic('dm_policy_contract', [
			_make_factor('holder_name', FactorType.TEXT, label='Holder Name'),
			_make_factor('holder_id_no', FactorType.ID_NO),
		])
		terms = [
			PIITermRef(
				termId='term-1', name='证件号码', category='客户数据', sensitivityLevel='1级',
				linkedFactors=[LinkedFactorRef(
					topicId='tid-dm_policy_contract', factorId='fid-holder_id_no', confirmed=True)]),
			PIITermRef(
				termId='term-2', name='姓名', category='客户数据', sensitivityLevel='2级',
				linkedFactors=[LinkedFactorRef(
					topicId='tid-dm_policy_contract', factorId='fid-holder_id_no', confirmed=False)]),
		]
		ontology = _make_ontology([
			VirtualObjectAttribute(name='holderName', sourceTable='c', sourceField='holder_name'),
			VirtualObjectAttribute(name='idNo', sourceTable='c', sourceField='holder_id_no'),
		])

		gov_map = _build_service([topic], terms=terms).build_map(ontology)

		self.assertEqual('o1', gov_map.ontologyId)
		self.assertEqual(1, len(gov_map.objects))
		obj = gov_map.objects[0]
		self.assertEqual('vo1', obj.objectId)
		self.assertEqual('policy_holder', obj.objectName)
		self.assertEqual(2, len(obj.attributes))

		name_attr = obj.attributes[0]
		self.assertEqual('holderName', name_attr.name)
		self.assertEqual('c', name_attr.sourceTable)
		self.assertEqual('holder_name', name_attr.sourceField)
		self.assertEqual('tid-dm_policy_contract', name_attr.topicId)
		self.assertEqual('dm_policy_contract', name_attr.topicName)
		self.assertEqual('fid-holder_name', name_attr.factorId)
		self.assertEqual('Holder Name', name_attr.factorLabel)
		self.assertEqual(FactorType.TEXT.value, name_attr.factorType)
		self.assertIsNone(name_attr.encrypt)
		self.assertFalse(name_attr.sensitiveType)
		self.assertFalse(name_attr.masked)
		self.assertEqual([], name_attr.piiTerms)

		id_attr = obj.attributes[1]
		self.assertEqual(FactorType.ID_NO.value, id_attr.factorType)
		self.assertTrue(id_attr.sensitiveType)
		self.assertTrue(id_attr.masked)
		self.assertEqual(2, len(id_attr.piiTerms))
		by_term = {t.termId: t for t in id_attr.piiTerms}
		self.assertTrue(by_term['term-1'].confirmed)
		self.assertEqual('证件号码', by_term['term-1'].name)
		self.assertEqual('客户数据', by_term['term-1'].category)
		self.assertEqual('1级', by_term['term-1'].sensitivityLevel)
		self.assertFalse(by_term['term-2'].confirmed)

	def test_unresolvable_attribute_never_fails(self) -> None:
		topic = _make_topic('dm_policy_contract', [_make_factor('holder_name')])
		ontology = _make_ontology([
			# unknown source table alias
			VirtualObjectAttribute(name='ghost1', sourceTable='nope', sourceField='holder_name'),
			# factor name not in topic
			VirtualObjectAttribute(name='ghost2', sourceTable='c', sourceField='missing_field'),
			# no source field at all
			VirtualObjectAttribute(name='ghost3', sourceTable='c'),
		])
		terms = [PIITermRef(
			termId='term-1', name='姓名',
			linkedFactors=[LinkedFactorRef(topicId='tid-dm_policy_contract', factorId='fid-holder_name')])]
		rules = [_make_rule('r-topic', MonitorRuleGrade.TOPIC, topic_id='tid-dm_policy_contract')]

		gov_map = _build_service([topic], terms=terms, rules=rules).build_map(ontology)

		attrs = gov_map.objects[0].attributes
		self.assertEqual(3, len(attrs))
		for attr in attrs:
			self.assertIsNone(attr.topicId)
			self.assertIsNone(attr.factorId)
			self.assertIsNone(attr.factorType)
			self.assertIsNone(attr.encrypt)
			self.assertFalse(attr.sensitiveType)
			self.assertFalse(attr.masked)
			self.assertEqual([], attr.piiTerms)
			# GLOBAL rules only; none defined here
			self.assertEqual([], attr.monitorRules)

	def test_missing_topic_never_fails(self) -> None:
		# topic does not exist in storage at all
		ontology = _make_ontology([
			VirtualObjectAttribute(name='a', sourceTable='c', sourceField='holder_name'),
		])
		gov_map = _build_service([]).build_map(ontology)
		attr = gov_map.objects[0].attributes[0]
		self.assertIsNone(attr.topicId)
		self.assertEqual([], attr.piiTerms)

	def test_monitor_rules_matched_by_grade(self) -> None:
		topic = _make_topic('dm_policy_contract', [
			_make_factor('holder_name'),
			_make_factor('holder_id_no', FactorType.ID_NO),
		])
		rules = [
			_make_rule('r-global', MonitorRuleGrade.GLOBAL),
			_make_rule('r-topic', MonitorRuleGrade.TOPIC, topic_id='tid-dm_policy_contract'),
			_make_rule('r-factor-hit', MonitorRuleGrade.FACTOR,
			           topic_id='tid-dm_policy_contract', factor_id='fid-holder_id_no'),
			_make_rule('r-factor-miss', MonitorRuleGrade.FACTOR,
			           topic_id='tid-dm_policy_contract', factor_id='fid-holder_name', enabled=False),
			_make_rule('r-other-topic', MonitorRuleGrade.TOPIC, topic_id='tid-other'),
		]
		ontology = _make_ontology([
			VirtualObjectAttribute(name='idNo', sourceTable='c', sourceField='holder_id_no'),
			VirtualObjectAttribute(name='holderName', sourceTable='c', sourceField='holder_name'),
		])

		gov_map = _build_service([topic], rules=rules).build_map(ontology)
		id_attr, name_attr = gov_map.objects[0].attributes

		def rule_ids(attr) -> Dict[str, bool]:
			return {r.ruleId: r.enabled for r in attr.monitorRules}

		# global + topic + exact factor hit; other-topic excluded
		self.assertEqual(
			{'r-global': True, 'r-topic': True, 'r-factor-hit': True},
			rule_ids(id_attr))
		# global + topic + factor rule on this factor (disabled flag carried through)
		self.assertEqual(
			{'r-global': True, 'r-topic': True, 'r-factor-miss': False},
			rule_ids(name_attr))
		grades = {r.ruleId: r.grade for r in id_attr.monitorRules}
		self.assertEqual(MonitorRuleGrade.GLOBAL.value, grades['r-global'])
		self.assertEqual(MonitorRuleGrade.TOPIC.value, grades['r-topic'])
		self.assertEqual(MonitorRuleGrade.FACTOR.value, grades['r-factor-hit'])

	def test_masked_and_encrypt_determination(self) -> None:
		topic = _make_topic('dm_policy_contract', [
			# encrypt configured on a non-sensitive type -> masked, encrypt echoed
			_make_factor('secret_note', FactorType.TEXT, encrypt=FactorEncryptMethod.AES256_PKCS5_PADDING),
			# encrypt NONE on a sensitive type -> masked by type, encrypt reported as null
			_make_factor('holder_phone', FactorType.PHONE, encrypt=FactorEncryptMethod.NONE),
			# non-sensitive type, no encrypt -> plain
			_make_factor('remark', FactorType.TEXT),
		])
		ontology = _make_ontology([
			VirtualObjectAttribute(name='secretNote', sourceTable='c', sourceField='secret_note'),
			VirtualObjectAttribute(name='phone', sourceTable='c', sourceField='holder_phone'),
			VirtualObjectAttribute(name='remark', sourceTable='c', sourceField='remark'),
		])

		gov_map = _build_service([topic]).build_map(ontology)
		secret, phone, remark = gov_map.objects[0].attributes

		self.assertEqual(FactorEncryptMethod.AES256_PKCS5_PADDING.value, secret.encrypt)
		self.assertFalse(secret.sensitiveType)
		self.assertTrue(secret.masked)

		self.assertIsNone(phone.encrypt)
		self.assertTrue(phone.sensitiveType)
		self.assertTrue(phone.masked)

		self.assertIsNone(remark.encrypt)
		self.assertFalse(remark.sensitiveType)
		self.assertFalse(remark.masked)

	def test_derived_attributes_excluded(self) -> None:
		topic = _make_topic('dm_policy_contract', [_make_factor('holder_name')])
		ontology = _make_ontology([
			VirtualObjectAttribute(name='holderName', sourceTable='c', sourceField='holder_name'),
		])
		ontology.virtualObjects[0].derivedAttributes = [{'id': 'd1', 'name': 'policyCount'}]

		gov_map = _build_service([topic]).build_map(ontology)
		self.assertEqual(1, len(gov_map.objects[0].attributes))
		self.assertEqual('holderName', gov_map.objects[0].attributes[0].name)


if __name__ == '__main__':
	unittest.main()
