import {toConnectedSpace} from '@/routes/utils';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {Subject, SubjectId} from '@/services/data/tuples/subject-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {SubjectHeader} from './header';
import {SubjectBodyRouter} from './subject-body-router';
import {SubjectEventBusProvider} from './subject-event-bus';

export const SubjectView = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	const {subjectId} = useParams<{ subjectId: SubjectId }>();

	const navigate = useNavigate();
	const {fire: fireGlobal} = useEventBus();
	const [subject, setSubject] = useState<Subject | null>(null);
	useEffect(() => {
		// eslint-disable-next-line
		const subject = connectedSpace.subjects.find(subject => subject.subjectId == subjectId);
		if (subject) {
			setSubject(subject);
		} else {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{Lang.CONSOLE.ERROR.SUBJECT_NOT_FOUND}</AlertLabel>, () => {
				navigate(toConnectedSpace(connectedSpace.connectId), {replace: true});
			});
		}
	}, [connectedSpace.connectId, connectedSpace.subjects, subjectId, fireGlobal, navigate]);
	useHelp(HELP_KEYS.CONSOLE_SUBJECT);

	// eslint-disable-next-line
	if (!subject || subject.subjectId !== subjectId) {
		return null;
	}

	return <SubjectEventBusProvider>
		<SubjectHeader connectedSpace={connectedSpace} subject={subject}/>
		<SubjectBodyRouter connectedSpace={connectedSpace} subject={subject}/>
	</SubjectEventBusProvider>;
};