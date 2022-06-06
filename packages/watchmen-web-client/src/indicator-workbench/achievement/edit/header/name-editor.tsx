import {Achievement} from '@/services/data/tuples/achievement-types';
import {noop} from '@/services/utils';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import React from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';

export const NameEditor = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const {fire} = useAchievementEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChange = async (name: string) => {
		achievement.name = name;
		forceUpdate();
	};
	const onNameChangeComplete = async (name: string) => {
		achievement.name = name.trim() || 'Noname Achievement';
		forceUpdate();
		fire(AchievementEventTypes.NAME_CHANGED, achievement, noop);
	};

	return <PageTitleEditor title={achievement.name}
	                        defaultTitle="Noname Achievement"
	                        onChange={onNameChange} onChangeComplete={onNameChangeComplete}/>;
};