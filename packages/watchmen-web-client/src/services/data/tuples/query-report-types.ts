import {Report} from './report-types';
import {QueryTuple} from './tuple-types';

export interface QueryReport extends Pick<Report, 'reportId' | 'name' | 'description' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
}
