from watchmen_model.admin import Factor, FactorType


def has_year_or_month(factor: Factor) -> bool:
	return \
			factor.type == FactorType.DATETIME \
			or factor.type == FactorType.FULL_DATETIME \
			or factor.type == FactorType.DATE \
			or factor.type == FactorType.DATE_OF_BIRTH
