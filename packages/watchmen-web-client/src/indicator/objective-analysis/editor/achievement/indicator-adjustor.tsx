import {Achievement} from '@/services/data/tuples/achievement-types';
import {ICON_INDICATOR_INDICATOR} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useState} from 'react';
import {useAchievementEventBus} from '../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement/achievement-event-bus-types';
import {AchievementIndicatorAdjustButton} from './widgets';

export const AchievementIndicatorAdjustor = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const {fire} = useAchievementEventBus();
	const [visible, setVisible] = useState(true);

	const onViewModeClicked = () => {
		setVisible(!visible);
		fire(AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, achievement, !visible);
	};

	return <AchievementIndicatorAdjustButton ink={ButtonInk.PRIMARY} onClick={onViewModeClicked}>
		<FontAwesomeIcon icon={ICON_INDICATOR_INDICATOR}/>
	</AchievementIndicatorAdjustButton>;
};