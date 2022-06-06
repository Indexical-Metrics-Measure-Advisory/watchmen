import {useAdminCacheEventBus} from '@/admin/cache/cache-event-bus';
import {AdminCacheEventTypes} from '@/admin/cache/cache-event-bus-types';
import {TopicSnapshotFrequency, TopicSnapshotScheduler} from '@/services/data/tuples/topic-snapshot-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {DwarfButton} from '@/widgets/basic/button';
import {ICON_EDIT} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {EditDialog} from './edit-dialog';
import {ResultBodyCell, ResultBodyRow} from './widgets';

const WEEKDAY_LABELS = {
	mon: 'Monday',
	tue: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday'
};

const asDisplayFrequency = (scheduler: TopicSnapshotScheduler) => {
	const {frequency, weekday = 'mon', day = '1', hour = 0, minute = 0} = scheduler;

	const h = hour < 10 ? `0${hour}` : `${hour}`;
	const m = minute < 10 ? `0${minute}` : `${minute}`;
	const time = `${h}:${m}`;

	switch (frequency) {
		case TopicSnapshotFrequency.MONTHLY:
			if (day === 'L') {
				return `${time}, Last Day of Month`;
				// eslint-disable-next-line
			} else if (day == '1') {
				return `${time}, ${day}st Day of Month`;
				// eslint-disable-next-line
			} else if (day == '2') {
				return `${time}, ${day}nd Day of Month`;
				// eslint-disable-next-line
			} else if (day == '3') {
				return `${time}, ${day}rd Day of Month`;
			} else {
				return `${time}, ${day}th Day of Month`;
			}
		case TopicSnapshotFrequency.WEEKLY:
			return `${time}, Every ${(WEEKDAY_LABELS as any)[weekday] ?? 'Monday'}`;
		case TopicSnapshotFrequency.DAILY:
		default:
			return `${time}, Everyday`;
	}
};

export const SchedulerRow = (props: {
	scheduler: TopicSnapshotScheduler;
	index: number;
	topics: Array<Topic>;
}) => {
	const {scheduler, index, topics} = props;
	const {topicId} = scheduler;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useAdminCacheEventBus();
	const forceUpdate = useForceUpdate();

	const onEditConfirmed = async (editedScheduler: TopicSnapshotScheduler) => {
		// @ts-ignore
		Object.keys(editedScheduler).forEach(key => scheduler[key] = editedScheduler[key] as any);
		await new Promise<void>(resolve => {
			fireCache(AdminCacheEventTypes.ASK_LOAD_MORE, resolve);
		});
		forceUpdate();
	};
	const onEditClicked = () => {
		// eslint-disable-next-line
		const topic = topics.find(topic => topic.topicId == topicId);
		fireGlobal(EventTypes.SHOW_DIALOG,
			<EditDialog scheduler={scheduler} topic={topic} onConfirm={onEditConfirmed}/>,
			{
				marginTop: '10vh',
				marginLeft: '20%',
				width: '60%',
				height: '80vh'
			});
	};

	// eslint-disable-next-line
	const topic = topics.find(topic => topic.topicId == topicId);
	const topicName = topic?.name || 'Noname Topic';

	return <ResultBodyRow>
		<ResultBodyCell>{index}</ResultBodyCell>
		<ResultBodyCell>{topicName}</ResultBodyCell>
		<ResultBodyCell>{asDisplayFrequency(scheduler)}</ResultBodyCell>
		<ResultBodyCell>{scheduler.enabled ? 'Y' : 'N'}</ResultBodyCell>
		<ResultBodyCell>
			<DwarfButton onClick={onEditClicked}>
				<FontAwesomeIcon icon={ICON_EDIT}/>
			</DwarfButton>
		</ResultBodyCell>
	</ResultBodyRow>;
};