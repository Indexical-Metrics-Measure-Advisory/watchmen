import {
	ComputedObjectiveParameter,
	ConstantObjectiveParameter,
	Objective,
	ObjectiveFactorKind,
	ObjectiveFactorOnIndicator,
	ObjectiveFormulaOperator,
	ObjectiveParameterType,
	ObjectiveTargetBetterSide,
	ObjectiveVariableKind,
	ObjectiveVariableOnValue,
	ReferObjectiveParameter
} from '../../tuples/objective-types';
import {generateUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
import {INDICATOR_MONTHLY_ORDER_PREMIUM_ID} from './mock-data-indicators';

export const OBJECTIVE_MONTHLY_SALES_ID = '1';

const MONTHLY_PREMIUM_FACTOR_ID = generateUuid();

export const MonthlySalesObjective: Objective = {
	objectiveId: OBJECTIVE_MONTHLY_SALES_ID,
	name: 'Monthly Sales',
	description: '',
	targets: [
		{
			uuid: generateUuid(), name: 'Monthly Premium Amount',
			tobe: '1000000', asis: MONTHLY_PREMIUM_FACTOR_ID, betterSide: ObjectiveTargetBetterSide.MORE
		},
		{
			uuid: generateUuid(), name: 'Monthly Profit Amount',
			tobe: '200000', asis: {
				kind: ObjectiveParameterType.COMPUTED, operator: ObjectiveFormulaOperator.MULTIPLY,
				parameters: [
					{kind: ObjectiveParameterType.REFER, uuid: MONTHLY_PREMIUM_FACTOR_ID} as ReferObjectiveParameter,
					{
						kind: ObjectiveParameterType.COMPUTED, operator: ObjectiveFormulaOperator.ROUND,
						parameters: [
							{
								kind: ObjectiveParameterType.CONSTANT,
								value: '{&ProfitRate}'
							} as ConstantObjectiveParameter
						]
					} as ComputedObjectiveParameter
				]
			},
			betterSide: ObjectiveTargetBetterSide.MORE
		}
	],
	variables: [
		{name: 'ProfitRate', kind: ObjectiveVariableKind.SINGLE_VALUE, value: '20.4'} as ObjectiveVariableOnValue
	],
	factors: [
		{
			uuid: MONTHLY_PREMIUM_FACTOR_ID, kind: ObjectiveFactorKind.INDICATOR, name: 'Monthly Premium',
			indicatorId: INDICATOR_MONTHLY_ORDER_PREMIUM_ID
		} as ObjectiveFactorOnIndicator
	],
	userGroupIds: [],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const DemoObjectives = [MonthlySalesObjective];