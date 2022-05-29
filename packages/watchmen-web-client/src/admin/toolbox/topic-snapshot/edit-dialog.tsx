import {TopicSnapshotFrequency, TopicSnapshotScheduler} from '@/services/data/admin/topic-snapshot-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {Button} from '@/widgets/basic/button';
import {Dropdown} from '@/widgets/basic/dropdown';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {DialogBody, DialogFooter, DialogTitle} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useState} from 'react';
import {TopFilterEdit} from './top-filter-edit';
import {EditLabel, ResultRowEditor, TriggerFilterContainer} from './widgets';

export const EditDialog = (props: {
	scheduler: TopicSnapshotScheduler;
	topic?: Topic;
	onConfirm: (scheduler: TopicSnapshotScheduler) => Promise<void>;
}) => {
	const {scheduler, topic, onConfirm} = props;

	const {fire: fireGlobal} = useEventBus();
	const [data] = useState<TopicSnapshotScheduler>({...scheduler});
	const forceUpdate = useForceUpdate();

	const {frequency, weekday = 'mon', day = '1', hour = 0, minute = 0} = data;

	const onFrequencyChange = (option: DropdownOption) => {
		data.frequency = option.value as TopicSnapshotFrequency;
		forceUpdate();
	};
	const onDayOfMonthChange = (option: DropdownOption) => {
		data.day = option.value as string;
		forceUpdate();
	};
	const onWeekdayChange = (option: DropdownOption) => {
		data.weekday = option.value as string;
		forceUpdate();
	};
	const onHourChange = (option: DropdownOption) => {
		data.hour = option.value as number;
		forceUpdate();
	};
	const onMinuteChange = (option: DropdownOption) => {
		data.minute = option.value as number;
		forceUpdate();
	};
	const onConfirmClicked = async () => {
		// TODO save
		await onConfirm(data);
		fireGlobal(EventTypes.HIDE_DIALOG);
	};
	const onCancelClicked = () => {
		fireGlobal(EventTypes.HIDE_DIALOG);
	};

	const frequencyOptions = [
		{value: TopicSnapshotFrequency.DAILY, label: 'Daily'},
		{value: TopicSnapshotFrequency.WEEKLY, label: 'Weekly'},
		{value: TopicSnapshotFrequency.MONTHLY, label: 'Monthly'}
	];
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

	return <>
		<DialogTitle>Topic Snapshot Scheduler [{topic?.name ?? 'Noname Topic'}]</DialogTitle>
		<DialogBody>
			<ResultRowEditor>
				<EditLabel>Frequency</EditLabel>
				<Dropdown value={frequency} options={frequencyOptions} onChange={onFrequencyChange}/>
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
				<EditLabel>Filter by</EditLabel>
				<TriggerFilterContainer>
					<TopFilterEdit topic={topic!} scheduler={data}/>
				</TriggerFilterContainer>
			</ResultRowEditor>
		</DialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>Confirm</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>Cancel</Button>
		</DialogFooter>
	</>;
};