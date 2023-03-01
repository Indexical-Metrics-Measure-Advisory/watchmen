import {
	ConstantObjectiveParameter,
	Objective,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator,
	ObjectiveFormulaOperator,
	ObjectiveParameterType,
	ObjectiveTargetBetterSide,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange,
	ObjectiveVariableOnValue,
	ReferObjectiveParameter
} from '../../tuples/objective-types';
import {generateUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
import {BUCKET_CITIES_ID} from './mock-data-buckets';
import {INDICATOR_MONTHLY_ORDER_PREMIUM_ID} from './mock-data-indicators';

export const OBJECTIVE_MONTHLY_SALES_ID = '1';

const REVENUE_FACTOR_ID = generateUuid();
const MATERIAL_COST_FACTOR_ID = generateUuid();
const SALES_COST_FACTOR_ID = generateUuid();
const TAX_COST_FACTOR_ID = generateUuid();
const ALL_COST_FACTOR_ID = generateUuid();
const PROFIT_FACTOR_ID = generateUuid();

export const MonthlySalesObjective: Objective = {
	objectiveId: OBJECTIVE_MONTHLY_SALES_ID,
	name: 'Monthly Budget',
	description: '',
	targets: [
		{
			uuid: generateUuid(), name: 'Revenue',
			tobe: '1000000', asis: REVENUE_FACTOR_ID, betterSide: ObjectiveTargetBetterSide.MORE,
			askPreviousCycle: true, askChainCycle: true
		},
		{
			uuid: generateUuid(), name: 'Sales Cost',
			tobe: '150000', asis: SALES_COST_FACTOR_ID, betterSide: ObjectiveTargetBetterSide.LESS
		},
		{
			uuid: generateUuid(), name: 'Cost Amount',
			tobe: '900000', asis: ALL_COST_FACTOR_ID, betterSide: ObjectiveTargetBetterSide.LESS
		},
		{
			uuid: generateUuid(), name: 'Profit Amount',
			tobe: '100000', asis: PROFIT_FACTOR_ID, betterSide: ObjectiveTargetBetterSide.MORE
		},
		{
			uuid: generateUuid(), name: 'Profit Rate',
			tobe: '10%', asis: {
				kind: ObjectiveParameterType.COMPUTED, operator: ObjectiveFormulaOperator.DIVIDE,
				parameters: [
					{kind: ObjectiveParameterType.REFER, uuid: PROFIT_FACTOR_ID} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.REFER, uuid: REVENUE_FACTOR_ID} as ReferObjectiveParameter
				]
			},
			betterSide: ObjectiveTargetBetterSide.MORE
		}
	],
	variables: [
		{name: 'MaterialCostRate', kind: ObjectiveVariableKind.SINGLE_VALUE, value: '0.68'} as ObjectiveVariableOnValue,
		{name: 'SalesCostRate', kind: ObjectiveVariableKind.SINGLE_VALUE, value: '0.15'} as ObjectiveVariableOnValue,
		{name: 'TaxCostRate', kind: ObjectiveVariableKind.SINGLE_VALUE, value: '0.07'} as ObjectiveVariableOnValue,
		{
			name: 'RangeSample', kind: ObjectiveVariableKind.RANGE,
			includeMin: false, includeMax: true, min: '1', max: '100'
		} as ObjectiveVariableOnRange,
		{
			name: 'BucketSample', kind: ObjectiveVariableKind.BUCKET,
			bucketId: BUCKET_CITIES_ID, segmentName: 'NY'
		} as ObjectiveVariableOnBucket
	],
	factors: [
		{
			uuid: REVENUE_FACTOR_ID, kind: ObjectiveFactorKind.INDICATOR, name: 'Revenue',
			indicatorId: INDICATOR_MONTHLY_ORDER_PREMIUM_ID
		} as ObjectiveFactorOnIndicator,
		{
			uuid: MATERIAL_COST_FACTOR_ID, kind: ObjectiveFactorKind.COMPUTED, name: 'Material Cost',
			formula: {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.MULTIPLY,
				parameters: [
					{
						kind: ObjectiveParameterType.REFER,
						uuid: REVENUE_FACTOR_ID
					} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.CONSTANT, value: '{&MaterialCostRate}'} as ConstantObjectiveParameter
				]
			}
		} as ObjectiveFactorOnComputation,
		{
			uuid: SALES_COST_FACTOR_ID, kind: ObjectiveFactorKind.COMPUTED, name: 'Sales Cost',
			formula: {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.MULTIPLY,
				parameters: [
					{
						kind: ObjectiveParameterType.REFER,
						uuid: REVENUE_FACTOR_ID
					} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.CONSTANT, value: '{&SalesCostRate}'} as ConstantObjectiveParameter
				]
			}
		} as ObjectiveFactorOnComputation,
		{
			uuid: TAX_COST_FACTOR_ID, kind: ObjectiveFactorKind.COMPUTED, name: 'Tax Cost',
			formula: {
				kind: ObjectiveParameterType.COMPUTED,
				operator: ObjectiveFormulaOperator.MULTIPLY,
				parameters: [
					{
						kind: ObjectiveParameterType.REFER,
						uuid: REVENUE_FACTOR_ID
					} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.CONSTANT, value: '{&TaxCostRate}'} as ConstantObjectiveParameter
				]
			}
		} as ObjectiveFactorOnComputation,
		{
			uuid: ALL_COST_FACTOR_ID, kind: ObjectiveFactorKind.COMPUTED, name: 'All Cost',
			formula: {
				kind: ObjectiveParameterType.COMPUTED, operator: ObjectiveFormulaOperator.ADD,
				parameters: [
					{kind: ObjectiveParameterType.REFER, uuid: MATERIAL_COST_FACTOR_ID} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.REFER, uuid: SALES_COST_FACTOR_ID} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.REFER, uuid: TAX_COST_FACTOR_ID} as ReferObjectiveParameter
				]
			}
		} as ObjectiveFactorOnComputation,
		{
			uuid: PROFIT_FACTOR_ID, kind: ObjectiveFactorKind.COMPUTED, name: 'Profit Amount',
			formula: {
				kind: ObjectiveParameterType.COMPUTED, operator: ObjectiveFormulaOperator.SUBTRACT,
				parameters: [
					{kind: ObjectiveParameterType.REFER, uuid: REVENUE_FACTOR_ID} as ReferObjectiveParameter,
					{kind: ObjectiveParameterType.REFER, uuid: ALL_COST_FACTOR_ID} as ReferObjectiveParameter
				]
			}
		} as ObjectiveFactorOnComputation
	],
	userGroupIds: [],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const DemoObjectives = [MonthlySalesObjective];