import {ICON_REFRESH} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';

export const HeaderRefreshButton = () => {
	const {fire} = useObjectiveEventBus();

	const onRefreshClicked = () => {
		fire(ObjectiveEventTypes.ASK_VALUES);
	};

	return <PageHeaderButton tooltip={Lang.CONSOLE.DERIVED_OBJECTIVE.REFRESH_VALUES} onClick={onRefreshClicked}>
		<FontAwesomeIcon icon={ICON_REFRESH}/>
	</PageHeaderButton>;
};