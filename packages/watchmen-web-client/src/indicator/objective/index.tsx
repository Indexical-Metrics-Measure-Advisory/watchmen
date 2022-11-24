import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {ObjectivesEventBusProvider} from './objectives-event-bus';

const ObjectiveIndex = () => {
	useHelp(HELP_KEYS.IDW_OBJECTIVE_ANALYSIS);

	return <ObjectivesEventBusProvider>
	</ObjectivesEventBusProvider>;
};

export default ObjectiveIndex;