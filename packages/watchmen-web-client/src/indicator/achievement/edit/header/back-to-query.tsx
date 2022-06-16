import {ICON_INDICATOR_ACHIEVEMENT} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';

export const BackToQueryButton = () => {
	const {fire} = useAchievementEventBus();

	const onBackClicked = () => {
		fire(AchievementEventTypes.BACK_TO_QUERY);
	};

	return <PageHeaderButton tooltip={Lang.INDICATOR.ACHIEVEMENT.BACK_TO_QUERY} onClick={onBackClicked}>
		<FontAwesomeIcon icon={ICON_INDICATOR_ACHIEVEMENT}/>
	</PageHeaderButton>;
};