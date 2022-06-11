import {saveAchievement} from '@/services/data/tuples/achievement';
import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {QueryAchievement} from '@/services/data/tuples/query-achievement-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {createAchievement} from '../../../achievement/utils';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';
import {AchievementButton, AchievementDropdown, AchievementLabel, CreateOrFindContainer, OrLabel} from './widgets';

export const CreateOrFindEditor = (props: {
	onPicked: (achievementId: AchievementId) => void;
}) => {
	const {onPicked} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const [selectedAchievementId, setSelectedAchievementId] = useState<AchievementId | null>(null);
	const [achievements, setAchievements] = useState<Array<QueryAchievement>>([]);
	useEffect(() => {
		fire(ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, (achievements) => {
			setAchievements(achievements);
		});
	}, [fire]);

	const onChange = (option: DropdownOption) => {
		setSelectedAchievementId(option.value as AchievementId);
	};
	const onViewClicked = () => {
		if (selectedAchievementId == null) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{Lang.INDICATOR.ACHIEVEMENT.ACHIEVEMENT_IS_REQUIRED}
			</AlertLabel>);
		} else {
			onPicked(selectedAchievementId);
		}
	};
	const onCreateClicked = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => {
				const achievement = createAchievement();
				await saveAchievement(achievement);
				return achievement;
			},
			(achievement: Achievement) => {
				onPicked(achievement.achievementId);
			});
	};

	const options = achievements.map(achievement => {
		return {
			value: achievement.achievementId,
			label: achievement.name || 'Noname Achievement'
		};
	});

	return <CreateOrFindContainer>
		<AchievementLabel>{Lang.INDICATOR.ACHIEVEMENT.PICK_ACHIEVEMENT_LABEL}</AchievementLabel>
		<AchievementDropdown value={selectedAchievementId} options={options} onChange={onChange}
		                     please={Lang.PLAIN.DROPDOWN_PLACEHOLDER}/>
		<AchievementButton ink={ButtonInk.PRIMARY} onClick={onViewClicked}>
			{Lang.INDICATOR.ACHIEVEMENT.PICK_ACHIEVEMENT}
		</AchievementButton>
		<OrLabel>{Lang.INDICATOR.ACHIEVEMENT.OR}</OrLabel>
		<AchievementButton ink={ButtonInk.PRIMARY} onClick={onCreateClicked}>
			{Lang.INDICATOR.ACHIEVEMENT.CREATE_ACHIEVEMENT}
		</AchievementButton>
	</CreateOrFindContainer>;
};