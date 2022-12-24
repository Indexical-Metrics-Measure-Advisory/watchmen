from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import ParameterComputeType, ParameterExpressionOperator
from watchmen_model.indicator import ObjectiveFormulaOperator, ObjectiveParameterExpressionOperator


def translate_expression_operator(operator: ObjectiveParameterExpressionOperator) -> ParameterExpressionOperator:
	if operator == ObjectiveParameterExpressionOperator.EMPTY:
		return ParameterExpressionOperator.EMPTY
	elif operator == ObjectiveParameterExpressionOperator.NOT_EMPTY:
		return ParameterExpressionOperator.NOT_EMPTY
	elif operator == ObjectiveParameterExpressionOperator.EQUALS:
		return ParameterExpressionOperator.EQUALS
	elif operator == ObjectiveParameterExpressionOperator.NOT_EQUALS:
		return ParameterExpressionOperator.NOT_EQUALS
	elif operator == ObjectiveParameterExpressionOperator.LESS:
		return ParameterExpressionOperator.LESS
	elif operator == ObjectiveParameterExpressionOperator.LESS_EQUALS:
		return ParameterExpressionOperator.LESS_EQUALS
	elif operator == ObjectiveParameterExpressionOperator.MORE:
		return ParameterExpressionOperator.MORE
	elif operator == ObjectiveParameterExpressionOperator.MORE_EQUALS:
		return ParameterExpressionOperator.MORE_EQUALS
	elif operator == ObjectiveParameterExpressionOperator.IN:
		return ParameterExpressionOperator.IN
	elif operator == ObjectiveParameterExpressionOperator.NOT_IN:
		return ParameterExpressionOperator.NOT_IN
	else:
		raise IndicatorKernelException(f'Objective parameter expression operator[{operator}] cannot be translated.')


def translate_computation_operator_in_factor_filter(operator: ObjectiveFormulaOperator) -> ParameterComputeType:
	if operator == ObjectiveFormulaOperator.NONE:
		return ParameterComputeType.NONE
	elif operator == ObjectiveFormulaOperator.ADD:
		return ParameterComputeType.ADD
	elif operator == ObjectiveFormulaOperator.SUBTRACT:
		return ParameterComputeType.SUBTRACT
	elif operator == ObjectiveFormulaOperator.MULTIPLY:
		return ParameterComputeType.MULTIPLY
	elif operator == ObjectiveFormulaOperator.DIVIDE:
		return ParameterComputeType.DIVIDE
	elif operator == ObjectiveFormulaOperator.MODULUS:
		return ParameterComputeType.MODULUS
	elif operator == ObjectiveFormulaOperator.YEAR_OF:
		return ParameterComputeType.YEAR_OF
	elif operator == ObjectiveFormulaOperator.HALF_YEAR_OF:
		return ParameterComputeType.HALF_YEAR_OF
	elif operator == ObjectiveFormulaOperator.QUARTER_OF:
		return ParameterComputeType.QUARTER_OF
	elif operator == ObjectiveFormulaOperator.MONTH_OF:
		return ParameterComputeType.MONTH_OF
	elif operator == ObjectiveFormulaOperator.WEEK_OF_YEAR:
		return ParameterComputeType.WEEK_OF_YEAR
	elif operator == ObjectiveFormulaOperator.WEEK_OF_MONTH:
		return ParameterComputeType.WEEK_OF_MONTH
	elif operator == ObjectiveFormulaOperator.DAY_OF_MONTH:
		return ParameterComputeType.DAY_OF_MONTH
	elif operator == ObjectiveFormulaOperator.DAY_OF_WEEK:
		return ParameterComputeType.DAY_OF_WEEK
	else:
		raise IndicatorKernelException(f'Objective parameter computation operator[{operator}] cannot be translated.')
