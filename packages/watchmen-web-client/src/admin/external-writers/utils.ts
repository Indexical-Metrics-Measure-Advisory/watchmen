import {ExternalWriter, ExternalWriterType} from '@/services/data/tuples/external-writer-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createExternalWriter = (): ExternalWriter => {
	return {
		writerId: generateUuid(),
		writerCode: '',
		name: '',
		type: ExternalWriterType.ELASTIC_SEARCH_WRITER,
		url: '',
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
