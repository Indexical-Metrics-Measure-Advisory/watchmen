import {Achievement} from '@/services/data/tuples/achievement-types';
import {ICON_INDICATOR_INDICATOR} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';

export const SwitchIndicatorCandidatesButton = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const {fire} = useAchievementEventBus();
	const [visible, setVisible] = useState(true);

	const onViewModeClicked = () => {
		setVisible(!visible);
		fire(AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, achievement, !visible);
	};

	const tooltip = visible
		? Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.HIDE_INDICATOR_CANDIDATES
		: Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.SHOW_INDICATOR_CANDIDATES;

	return <PageHeaderButton tooltip={tooltip}
	                         ink={visible ? ButtonInk.PRIMARY : undefined}
	                         onClick={onViewModeClicked}>
		<FontAwesomeIcon icon={ICON_INDICATOR_INDICATOR}/>
	</PageHeaderButton>;
};