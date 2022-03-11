import {Subject, SubjectId} from '../tuples/subject-types';
import {Token} from '../types';

export interface SharedSubject {
	subject: Subject;
}

/**
 * @deprecated
 */
export const fetchSharedSubject = async (subjectId: SubjectId, token: Token): Promise<SharedSubject> => {
	// if (isMockService()) {
	// 	return await fetchMockSharedSubject(subjectId, token);
	// } else {
	// 	const subject = await get({api: Apis.SUBJECT_SHARE_GET, search: {subjectId, token}, auth: false});
	// 	saveTokenIntoSession(token);
	// 	return await subject;
	// }
	return Promise.reject('Not implemented yet.');
};
