import {renameDerivedObjective} from '@/services/data/tuples/derived-objective';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useLanguage} from '@/widgets/langs';
import React from 'react';
import {useConsoleEventBus} from '../../console-event-bus';
import {ConsoleEventTypes} from '../../console-event-bus-types';

export const HeaderNameEditor = (props: { derivedObjective: DerivedObjective }) => {
	const {derivedObjective} = props;

	const language = useLanguage();
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChange = async (name: string) => {
		derivedObjective.name = name;
		forceUpdate();
		fire(ConsoleEventTypes.DERIVED_OBJECTIVE_RENAMED, derivedObjective);
	};
	const onNameChangeComplete = async (name: string) => {
		derivedObjective.name = name.trim() || language.PLAIN.DEFAULT_DERIVED_OBJECTIVE_NAME;
		forceUpdate();
		fire(ConsoleEventTypes.DERIVED_OBJECTIVE_RENAMED, derivedObjective);
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => await renameDerivedObjective(derivedObjective));
	};

	return <PageTitleEditor title={derivedObjective.name}
	                        defaultTitle={language.PLAIN.DEFAULT_DERIVED_OBJECTIVE_NAME}
	                        onChange={onNameChange} onChangeComplete={onNameChangeComplete}/>;
};
