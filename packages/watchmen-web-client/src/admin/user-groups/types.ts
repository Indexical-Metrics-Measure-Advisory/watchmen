import {QueryConvergenceForHolder} from '@/services/data/tuples/query-convergence-types';
import {QueryObjectiveForHolder} from '@/services/data/tuples/query-objective-types';
import {QuerySpaceForHolder} from '@/services/data/tuples/query-space-types';
import {QueryUserForHolder} from '@/services/data/tuples/query-user-types';
import {HoldByTuple} from '@/widgets/tuple-workbench/tuple-event-bus-types';

export interface HoldByUserGroup extends HoldByTuple {
	users?: Array<QueryUserForHolder>;
	spaces?: Array<QuerySpaceForHolder>;
	objectives?: Array<QueryObjectiveForHolder>;
	convergences?: Array<QueryConvergenceForHolder>;
}