import {fetchConnectedSpaces, renameConnectedSpace} from '@/services/data/tuples/connected-space';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useLanguage} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useConsoleEventBus} from '../../../console-event-bus';
import {ConsoleEventTypes} from '../../../console-event-bus-types';

export const HeaderConnectedSpaceNameEditor = (props: { connectedSpace: ConnectedSpace }) => {
	const {connectedSpace} = props;

	const language = useLanguage();
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();
	const forceUpdate = useForceUpdate();
	const [originalName, setOriginalName] = useState(connectedSpace.name);
	useEffect(() => {
		setOriginalName(connectedSpace.name);
	}, [connectedSpace]);

	const onNameChange = async (name: string) => {
		connectedSpace.name = name;
		forceUpdate();
		fire(ConsoleEventTypes.CONNECTED_SPACE_RENAMED, connectedSpace);
	};
	const onNameChangeComplete = async (name: string) => {
		const newName = name.trim();
		if (newName === originalName) {
			return;
		}

		connectedSpace.name = newName || language.PLAIN.DEFAULT_CONNECTED_SPACE_NAME;
		forceUpdate();
		fire(ConsoleEventTypes.CONNECTED_SPACE_RENAMED, connectedSpace);

		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchConnectedSpaces(),
			(connectedSpaces: Array<ConnectedSpace>) => {
				const duplicate = connectedSpaces.find(cs => cs.name === connectedSpace.name && cs.connectId !== connectedSpace.connectId);
				if (duplicate) {
					fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{language.PLAIN.CONNECTED_SPACE_NAME_EXIST}</AlertLabel>);
					connectedSpace.name = originalName;
					forceUpdate();
					fire(ConsoleEventTypes.CONNECTED_SPACE_RENAMED, connectedSpace);
				} else {
					fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
						async () => await renameConnectedSpace(connectedSpace),
						() => setOriginalName(connectedSpace.name));
				}
			});
	};

	return <PageTitleEditor title={connectedSpace.name}
	                        defaultTitle={language.PLAIN.DEFAULT_CONNECTED_SPACE_NAME}
	                        onChange={onNameChange} onChangeComplete={onNameChangeComplete}/>;
};
