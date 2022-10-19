import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {base64Encode} from '@/services/utils';
import {getCurrentLanguage} from '@/widgets/langs';

export const createAnalysis = (): ObjectiveAnalysis => {
	const analysisId = generateUuid();
	return {
		analysisId,
		title: `${getCurrentLanguage().PLAIN.NEW_OBJECTIVE_ANALYSIS_NAME} ${base64Encode(analysisId).substring(0, 12)}`,
		perspectives: [],
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
