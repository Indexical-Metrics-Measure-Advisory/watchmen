import {fetchConsoleSettingsData} from '@/services/data/console/settings';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {Fragment, useEffect, useState} from 'react';
import {useConsoleEventBus} from '../console-event-bus';
import {ConsoleEventTypes} from '../console-event-bus-types';
import {HoldSettings} from './types';
import {useConnectedSpace} from './use-connected-space';
import {useDashboard} from './use-dashboard';
import {useDerivedObjective} from './use-derived-objective';
import {useReplier} from './use-replier';

export const SettingsHolder = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useConsoleEventBus();
	const [holdSettings, setHoldSettings] = useState<HoldSettings>({
		initialized: false,
		connectedSpaces: [],
		connectedSpaceGraphics: [],
		derivedObjectives: [],

		availableSpaces: [],
		availableTopics: [],
		availableObjectives: [],
		enums: [],
		dashboards: [],

		favorite: {
			connectedSpaceIds: [],
			dashboardIds: [],
			derivedObjectiveIds: []
		},
		lastSnapshot: {
			favoritePin: false,
			language: 'en'
		}
	});

	useEffect(() => {
		if (!holdSettings.initialized) {
			(async () => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await fetchConsoleSettingsData(),
					(settings) => {
						setHoldSettings({initialized: true, ...settings, enums: []});
						if (settings.lastSnapshot && settings.lastSnapshot.language) {
							fireGlobal(EventTypes.CHANGE_LANGUAGE, settings.lastSnapshot.language);
						}
						fire(ConsoleEventTypes.SETTINGS_LOADED, settings);
					});
			})();
		}
	}, [fire, fireGlobal, holdSettings.initialized]);
	useReplier({holdSettings});

	useDashboard({setHoldSettings});
	useConnectedSpace({setHoldSettings});
	useDerivedObjective({setHoldSettings});

	return <Fragment/>;
};