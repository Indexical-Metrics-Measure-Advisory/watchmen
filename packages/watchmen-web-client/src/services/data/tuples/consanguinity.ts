import {Subject} from '@/services/data/tuples/subject-types';
import {Consanguinity, ConsanguinitySubjectColumn} from './consanguinity-types';

export const redressSubjectsToClientType = (consanguinity: Consanguinity): Consanguinity => {
	if (consanguinity.subjects == null) {
		return consanguinity;
	}

	// columns in consanguinity subject is not same as original server side subject
	// need to be redressed
	consanguinity.subjects.filter(subject => subject != null).forEach(subject => {
		const serverSideSubject = subject as unknown as Subject;
		subject.columns = serverSideSubject.dataset?.columns as unknown as Array<ConsanguinitySubjectColumn>;
	});

	return consanguinity;
};