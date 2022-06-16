import {Achievement, AchievementTimeRangeType} from '@/services/data/tuples/achievement-types';
import {noop} from '@/services/utils';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {TimeRangeCurve, TimeRangeNode, TimeRangeNodeContainer} from './widgets';

export const TimeRange = (props: { rootId: string; achievement: Achievement }) => {
	const {rootId, achievement} = props;

	const {fire} = useAchievementEventBus();
	const {fire: fireEdit} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	const {ref, curve} = useCurve(rootId);

	const onTimeRangeTypeChanged = (option: DropdownOption) => {
		const {timeRangeType: oldType} = achievement;
		const newType = option.value as AchievementTimeRangeType;
		if (oldType === newType) {
			return;
		}

		achievement.timeRangeType = newType;
		if (achievement.timeRangeYear == null) {
			achievement.timeRangeYear = `${new Date().getFullYear() - 1}`;
		}
		if (newType === AchievementTimeRangeType.YEAR) {
			delete achievement.timeRangeMonth;
		} else {
			achievement.timeRangeMonth = '1';
		}
		forceUpdate();
		fireEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, achievement);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};
	const onTimeRangeYearChanged = (option: DropdownOption) => {
		achievement.timeRangeYear = option.value as string;
		forceUpdate();
		fireEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, achievement);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};
	const onTimeRangeMonthChanged = (option: DropdownOption) => {
		achievement.timeRangeMonth = option.value as string;
		forceUpdate();
		fireEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, achievement);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};
	const onCompareWithChanged = (value: boolean) => {
		achievement.compareWithPreviousTimeRange = value;
		forceUpdate();
		fireEdit(AchievementEditEventTypes.TIME_RANGE_CHANGED, achievement);
		fire(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};

	const timeRangeTypeOptions = [
		{value: AchievementTimeRangeType.YEAR, label: Lang.INDICATOR.ACHIEVEMENT.TIME_RANGE_YEAR},
		{value: AchievementTimeRangeType.MONTH, label: Lang.INDICATOR.ACHIEVEMENT.TIME_RANGE_MONTH}
	];
	const timeRangeYearOptions = new Array(10).fill(1).map((_, index) => {
		const year = new Date().getFullYear() - index;
		return {value: `${year}`, label: `${year}`};
	});
	const timeRangeMonthOptions = [
		{value: '1', label: Lang.CALENDAR.JAN},
		{value: '2', label: Lang.CALENDAR.FEB},
		{value: '3', label: Lang.CALENDAR.MAR},
		{value: '4', label: Lang.CALENDAR.APR},
		{value: '5', label: Lang.CALENDAR.MAY},
		{value: '6', label: Lang.CALENDAR.JUN},
		{value: '7', label: Lang.CALENDAR.JUL},
		{value: '8', label: Lang.CALENDAR.AUG},
		{value: '9', label: Lang.CALENDAR.SEP},
		{value: '10', label: Lang.CALENDAR.OCT},
		{value: '11', label: Lang.CALENDAR.NOV},
		{value: '12', label: Lang.CALENDAR.DEC}
	];

	return <TimeRangeNodeContainer>
		<TimeRangeNode ref={ref}>
			<span>{Lang.INDICATOR.ACHIEVEMENT.TIME_RANGE}</span>
			<Dropdown value={achievement.timeRangeType ?? AchievementTimeRangeType.YEAR}
			          options={timeRangeTypeOptions}
			          onChange={onTimeRangeTypeChanged}/>
			<Dropdown value={achievement.timeRangeYear} options={timeRangeYearOptions}
			          onChange={onTimeRangeYearChanged}/>
			{achievement.timeRangeType === AchievementTimeRangeType.MONTH
				? <Dropdown value={achievement.timeRangeMonth} options={timeRangeMonthOptions}
				            onChange={onTimeRangeMonthChanged}/>
				: null}
			<span>{Lang.INDICATOR.ACHIEVEMENT.TIME_RANGE_COMPARE_WITH_PREVIOUS}</span>
			<CheckBox value={achievement.compareWithPreviousTimeRange} onChange={onCompareWithChanged}/>
		</TimeRangeNode>
		{curve == null
			? null
			: <TimeRangeCurve rect={curve}>
				<g>
					<path d={computeCurvePath(curve)}/>
				</g>
			</TimeRangeCurve>}
	</TimeRangeNodeContainer>;
};