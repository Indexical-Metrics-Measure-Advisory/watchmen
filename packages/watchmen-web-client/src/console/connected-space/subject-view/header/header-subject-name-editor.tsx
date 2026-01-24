import {renameSubject} from '@/services/data/tuples/subject';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {Subject} from '@/services/data/tuples/subject-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useLanguage} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useSubjectEventBus} from '../subject-event-bus';
import {SubjectEventTypes} from '../subject-event-bus-types';

export const HeaderSubjectNameEditor = (props: { connectedSpace: ConnectedSpace, subject: Subject }) => {
	const {connectedSpace, subject} = props;

	const language = useLanguage();
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useSubjectEventBus();
	const forceUpdate = useForceUpdate();
	const [originalName, setOriginalName] = useState(subject.name);
	useEffect(() => {
		setOriginalName(subject.name);
	}, [subject]);

	const onNameChange = async (name: string) => {
		subject.name = name;
		forceUpdate();
		fire(SubjectEventTypes.SUBJECT_RENAMED, subject);
	};
	const onNameChangeComplete = async (name: string) => {
		const newName = name.trim();
		if (newName === originalName) {
			return;
		}

		subject.name = newName || language.PLAIN.DEFAULT_SUBJECT_NAME;
		forceUpdate();

		const duplicate = connectedSpace.subjects.find(s => s.name === subject.name && s.subjectId !== subject.subjectId);
		if (duplicate) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{language.PLAIN.SUBJECT_NAME_EXIST}</AlertLabel>);
			subject.name = originalName;
			forceUpdate();
			fire(SubjectEventTypes.SUBJECT_RENAMED, subject);
		} else {
			fire(SubjectEventTypes.SUBJECT_RENAMED, subject);
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await renameSubject(subject),
				() => setOriginalName(subject.name));
		}
	};

	return <PageTitleEditor title={subject.name}
	                        defaultTitle={language.PLAIN.DEFAULT_SUBJECT_NAME}
	                        onChange={onNameChange} onChangeComplete={onNameChangeComplete}/>;
};
