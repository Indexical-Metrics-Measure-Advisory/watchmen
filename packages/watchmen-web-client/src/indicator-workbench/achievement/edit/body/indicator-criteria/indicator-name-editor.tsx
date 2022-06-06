import {Achievement, AchievementIndicator} from '@/services/data/tuples/achievement-types';
import {noop} from '@/services/utils';
import {Input} from '@/widgets/basic/input';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {IndicatorName} from './widgets';

export const IndicatorNameEditor = (props: {
	achievement: Achievement;
	achievementIndicator: AchievementIndicator;
}) => {
	const {achievement, achievementIndicator} = props;

	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		achievementIndicator.name = event.target.value;
		fireEdit(AchievementEditEventTypes.INDICATOR_NAME_CHANGED, achievement, achievementIndicator);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		forceUpdate();
	};

	return <IndicatorName>
		<span>{Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.INDICATOR_NAME}</span>
		<Input value={achievementIndicator.name ?? ''} onChange={onNameChanged}/>
	</IndicatorName>;
};