import {BreakdownDimensionType, DerivedObjective} from '../../tuples/derived-objective-types';
import {MeasureMethod} from '../../tuples/indicator-types';
import {generateUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
import {MonthlySalesObjective, OBJECTIVE_MONTHLY_SALES_ID} from './mock-data-objectives';

export const DemoDerivedObjectives: Array<DerivedObjective> = [
	{
		derivedObjectiveId: '1',
		objectiveId: OBJECTIVE_MONTHLY_SALES_ID,
		name: MonthlySalesObjective.name,
		definition: MonthlySalesObjective,
		breakdownTargets: [
			{
				uuid: generateUuid(),
				targetId: MonthlySalesObjective.targets![0].uuid,
				name: 'Yearly Revenue', dimensions: [
					{
						factorOrColumnId: '601',
						timeMeasureMethod: MeasureMethod.YEAR,
						type: BreakdownDimensionType.TIME_RELATED
					}
				]
			}
		],
		lastVisitTime: '2020/10/31 14:23:07',
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	}
];