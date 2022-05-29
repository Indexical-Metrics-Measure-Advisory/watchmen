import {TopicSnapshotFrequency, TopicSnapshotScheduler} from '@/services/data/admin/topic-snapshot-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {DwarfButton} from '@/widgets/basic/button';
import {ICON_EDIT} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {EditLabel, ResultBodyCell, ResultBodyRow, ResultRowEditor} from './widgets';

export const SchedulerRow = (props: {
	scheduler: TopicSnapshotScheduler;
	index: number;
	topics: Array<Topic>;
}) => {
	const {scheduler, index, topics} = props;
	const {schedulerId, topicId, frequency, condition, weekday = 'mon', day = '1', hour = 0, minute = 0} = scheduler;

	const forceUpdate = useForceUpdate();

	const onEditClicked = () => {
	};
	const onDayOfMonthChange = (option: DropdownOption) => {
		scheduler.day = option.value as string;
		forceUpdate();
	};
	const onWeekdayChange = (option: DropdownOption) => {
		scheduler.weekday = option.value as string;
		forceUpdate();
	};
	const onHourChange = (option: DropdownOption) => {
		scheduler.hour = option.value as number;
		forceUpdate();
	};
	const onMinuteChange = (option: DropdownOption) => {
		scheduler.minute = option.value as number;
		forceUpdate();
	};

	// eslint-disable-next-line
	const topic = topics.find(topic => topic.topicId == topicId);
	const topicName = topic?.name || 'Noname Topic';

	const dayOfMonthOptions = [
		{value: 'L', label: 'Last Day of Month'},
		...new Array(31).fill(1).map((_, index) => {
			return {value: index + 1, label: `${index + 1}`};
		})
	];
	const weekdayOptions = [
		{value: 'mon', label: 'Monday'},
		{value: 'tue', label: 'Tuesday'},
		{value: 'wed', label: 'Wednesday'},
		{value: 'thu', label: 'Thursday'},
		{value: 'fri', label: 'Friday'},
		{value: 'sat', label: 'Saturday'},
		{value: 'sun', label: 'Sunday'}
	];
	const hourOptions = new Array(24).fill(1).map((_, index) => {
		return {value: index, label: `${index}`};
	});
	const minuteOptions = new Array(60).fill(1).map((_, index) => {
		return {value: index, label: `${index}`};
	});

	return <ResultBodyRow key={schedulerId}>
		<ResultBodyCell>{index}</ResultBodyCell>
		<ResultBodyCell>{topicName}</ResultBodyCell>
		<ResultBodyCell>{frequency}</ResultBodyCell>
		<ResultBodyCell>
			<DwarfButton onClick={onEditClicked}>
				<FontAwesomeIcon icon={ICON_EDIT}/>
			</DwarfButton>
		</ResultBodyCell>
		<ResultRowEditor>
			{frequency === TopicSnapshotFrequency.MONTHLY
				? <>
					<EditLabel>Day of Month</EditLabel>
					<Dropdown value={day} options={dayOfMonthOptions} onChange={onDayOfMonthChange}/>
				</>
				: null}
			{frequency === TopicSnapshotFrequency.WEEKLY
				? <>
					<EditLabel>Weekday</EditLabel>
					<Dropdown value={weekday} options={weekdayOptions} onChange={onWeekdayChange}/>
				</>
				: null}
			<EditLabel>Hour</EditLabel>
			<Dropdown value={hour} options={hourOptions} onChange={onHourChange}/>
			<EditLabel>Minute</EditLabel>
			<Dropdown value={minute} options={minuteOptions} onChange={onMinuteChange}/>
			<EditLabel data-type="condition">Condition</EditLabel>
		</ResultRowEditor>
	</ResultBodyRow>;
};