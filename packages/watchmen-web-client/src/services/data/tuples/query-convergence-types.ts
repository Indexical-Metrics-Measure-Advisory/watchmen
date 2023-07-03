import {Convergence} from './convergence-types';
import {QueryTupleForHolder} from './tuple-types';

export type QueryConvergence = Pick<Convergence, 'convergenceId' | 'name' | 'description' | 'createdAt' | 'lastModifiedAt'>;

export interface QueryConvergenceForHolder extends Pick<Convergence, 'convergenceId' | 'name'>, QueryTupleForHolder {
}