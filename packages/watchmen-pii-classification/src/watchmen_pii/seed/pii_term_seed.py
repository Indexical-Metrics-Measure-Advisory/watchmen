"""Built-in PII classification terms.

The 11 default terms from the design doc (section 5), used to bootstrap a
fresh tenant. Mirrors the seed-loader pattern of
``watchmen_metricflow.data.glossary_seed_import``.
"""
from typing import List

from watchmen_auth import PrincipalService

from watchmen_pii.meta import PIITermService
from watchmen_pii.model import (
	PII_CATEGORY_BUSINESS,
	PII_CATEGORY_CUSTOMER,
	PIIClassificationTerm,
	MATCH_STRATEGY_LOGIC,
	SENSITIVITY_LEVEL_1,
	SENSITIVITY_LEVEL_2,
)


def default_pii_terms() -> List[PIIClassificationTerm]:
	"""Return the 11 built-in terms (without ids / audit fields filled)."""
	return [
		PIIClassificationTerm(
			name='证件号码',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			factorTypePatterns=['id-no'],
			keywordPatterns=['证件号', 'id_card', 'id_no', 'identity'],
		),
		PIIClassificationTerm(
			name='客户姓名',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			keywordPatterns=['姓名', 'name', 'customer_name', 'full_name'],
		),
		PIIClassificationTerm(
			name='出生日期',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			factorTypePatterns=['date-of-birth'],
			keywordPatterns=['出生日期', 'birth', 'birthday', 'dob'],
		),
		PIIClassificationTerm(
			name='手机号码',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			factorTypePatterns=['mobile', 'phone'],
			keywordPatterns=['手机', 'mobile', 'phone', 'cell'],
		),
		PIIClassificationTerm(
			name='家庭住址',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			factorTypePatterns=['address', 'province', 'city', 'district'],
			keywordPatterns=['住址', 'address', 'home'],
		),
		PIIClassificationTerm(
			name='邮箱地址',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			factorTypePatterns=['email'],
			keywordPatterns=['邮箱', 'email', 'mail'],
		),
		PIIClassificationTerm(
			name='保费',
			category=PII_CATEGORY_BUSINESS,
			sensitivityLevel=SENSITIVITY_LEVEL_2,
			keywordPatterns=['保费', 'premium', 'premium_amount'],
		),
		PIIClassificationTerm(
			name='保额',
			category=PII_CATEGORY_BUSINESS,
			sensitivityLevel=SENSITIVITY_LEVEL_2,
			keywordPatterns=['保额', 'sum_insured', 'insured_amount'],
		),
		PIIClassificationTerm(
			name='保单号',
			category=PII_CATEGORY_BUSINESS,
			sensitivityLevel=SENSITIVITY_LEVEL_2,
			keywordPatterns=['保单号', 'policy_no', 'policy_number'],
		),
		PIIClassificationTerm(
			name='账户金额',
			category=PII_CATEGORY_CUSTOMER,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			keywordPatterns=['账户余额', 'account_balance', 'balance', 'amount'],
		),
		PIIClassificationTerm(
			name='银行卡号',
			category=PII_CATEGORY_BUSINESS,
			sensitivityLevel=SENSITIVITY_LEVEL_1,
			keywordPatterns=['银行卡', 'bank_card', 'card_number'],
		),
	]


def import_seed_if_empty(
		pii_term_service: PIITermService,
		principal_service: PrincipalService,
) -> int:
	"""Create the default terms for the principal's tenant if none exist yet.

	Returns the number of terms created. Idempotent: a no-op when the tenant
	already has terms.
	"""
	tenant_id = principal_service.get_tenant_id()
	if not tenant_id:
		return 0
	existing = pii_term_service.find_all_for_tenant(tenant_id)
	if existing:
		return 0
	created = 0
	for term in default_pii_terms():
		term.tenantId = tenant_id
		term.matchStrategy = MATCH_STRATEGY_LOGIC
		if pii_term_service.is_storable_id_faked(term.termId):
			pii_term_service.redress_storable_id(term)
		pii_term_service.create(term)
		created += 1
	return created
