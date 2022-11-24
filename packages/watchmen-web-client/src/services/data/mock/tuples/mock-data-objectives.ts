import {getCurrentTime} from '@/services/data/utils';
import {Objective} from '../../tuples/objective-types';

export const OBJECTIVE_MONTHLY_SALES_ID = '1';

export const MonthlySalesObjective: Objective = {
	objectiveId: OBJECTIVE_MONTHLY_SALES_ID,
	name: 'Monthly Sales',
	description: '',
	userGroupIds: [],
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const DemoObjectives = [MonthlySalesObjective];