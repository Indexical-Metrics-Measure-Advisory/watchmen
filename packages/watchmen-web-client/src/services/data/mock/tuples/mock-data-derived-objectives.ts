import {DerivedObjective} from '../../tuples/derived-objective-types';
import {getCurrentTime} from '../../utils';
import {MonthlySalesObjective, OBJECTIVE_MONTHLY_SALES_ID} from './mock-data-objectives';

export const DemoDerivedObjectives: Array<DerivedObjective> = [
	{
		derivedObjectiveId: '1',
		objectiveId: OBJECTIVE_MONTHLY_SALES_ID,
		name: MonthlySalesObjective.name,
		definition: MonthlySalesObjective,
		breakdownTargets: [],
		lastVisitTime: '2020/10/31 14:23:07',
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	}
];