import {fetchSubjectForIndicator} from '@/services/data/tuples/indicator';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

type Subjects = Record<SubjectId, SubjectForIndicator>
export const useSubjectDetail = () => {
	const {on, off} = useObjectivesEventBus();
	const [subjects] = useState<Subjects>({});

	useEffect(() => {
		const onAskSubject = async (subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void) => {
			const found = subjects[`${subjectId}`];
			if (found != null) {
				onData(found);
			} else {
				const subject = await fetchSubjectForIndicator(subjectId);
				// sync to state
				subjects[`${subject.subjectId}`] = subject;
				onData(subject);
			}
		};
		on(ObjectivesEventTypes.ASK_SUBJECT, onAskSubject);
		return () => {
			off(ObjectivesEventTypes.ASK_SUBJECT, onAskSubject);
		};
	}, [on, off, subjects]);
};