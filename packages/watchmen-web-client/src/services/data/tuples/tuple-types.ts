import {DateTime} from '../types';

export interface Tuple {
	createdAt: DateTime;
	lastModifiedAt: DateTime;
}

export interface OptimisticLock {
	version: number;
}

export interface QueryTuple {
}

export interface QueryTupleForHolder {
}

export interface TupleHolder {
}

