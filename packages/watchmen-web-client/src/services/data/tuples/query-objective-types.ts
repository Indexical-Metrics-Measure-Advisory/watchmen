import {Objective} from './objective-types';
import {QueryTupleForHolder} from './tuple-types';

export type QueryObjective = Pick<Objective, 'objectiveId' | 'name' | 'targets' | 'description' | 'createdAt' | 'lastModifiedAt'>;

export interface QueryObjectiveForHolder extends Pick<Objective, 'objectiveId' | 'name'>, QueryTupleForHolder {
}