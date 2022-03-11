import {ExternalWriter} from './external-writer-types';
import {QueryTuple, QueryTupleForHolder} from './tuple-types';

export interface QueryExternalWriter extends Pick<ExternalWriter, 'writerId' | 'writerCode' | 'type' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
	tenantName: string;
}

export interface QueryExternalWriterForHolder extends Pick<ExternalWriter, 'writerId' | 'writerCode'>, QueryTupleForHolder {
}
