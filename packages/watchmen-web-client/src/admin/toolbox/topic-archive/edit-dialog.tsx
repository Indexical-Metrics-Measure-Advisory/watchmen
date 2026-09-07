import {saveTopicArchivePolicy} from '@/services/data/admin/topic-archive';
import {TopicArchivePolicy} from '@/services/data/tuples/topic-archive-types';
import {DataSource} from '@/services/data/tuples/data-source-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {DialogBody, DialogFooter, DialogTitle} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {ChangeEvent, useState} from 'react';
import {PolicyFilterEdit} from './filter-edit';
import {EditLabel, FilterContainer, ResultRowEditor} from './widgets';

export const EditDialog = (props: {
	policy: TopicArchivePolicy;
	topics: Array<Topic>;
	dataSources: Array<DataSource>;
	onConfirm: (policy: TopicArchivePolicy) => Promise<void>;
}) => {
	const {policy, topics, dataSources, onConfirm} = props;

	const {fire: fireGlobal} = useEventBus();
	const [data] = useState<TopicArchivePolicy>({...policy});
	const forceUpdate = useForceUpdate();

	const {hotDays, coldDays, batchSize, archiveDataSourceId, enabled, destroyRequiresApproval} = data;

	const onHotDaysChange = (event: ChangeEvent<HTMLInputElement>) => {
		const days = parseInt(event.target.value, 10);
		data.hotDays = isNaN(days) ? 0 : days;
		forceUpdate();
	};
	const onColdDaysChange = (option: DropdownOption) => {
		data.coldDays = option.value === '' ? null : (option.value as number);
		forceUpdate();
	};
	const onBatchSizeChange = (option: DropdownOption) => {
		data.batchSize = option.value as number;
		forceUpdate();
	};
	const onArchiveDataSourceChange = (option: DropdownOption) => {
		data.archiveDataSourceId = option.value as string;
		forceUpdate();
	};
	const onEnabledChange = (value: boolean) => {
		data.enabled = value;
		forceUpdate();
	};
	const onDestroyRequiresApprovalChange = (value: boolean) => {
		data.destroyRequiresApproval = value;
		forceUpdate();
	};

	const onConfirmClicked = () => {
		if (!data.hotDays || data.hotDays < 1) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Archive data before (days) must be a positive number.</AlertLabel>);
			return;
		}
		if (data.archiveDataSourceId == null || data.archiveDataSourceId.trim().length === 0) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Archive data source is required.</AlertLabel>);
			return;
		}
		// eslint-disable-next-line
		const confirmTopic = topics.find(topic => topic.topicId == data.topicId);
		if (confirmTopic != null && data.archiveDataSourceId === confirmTopic.dataSourceId) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				Archived data is moved into another storage, pick a data source different from the topic one.
			</AlertLabel>);
			return;
		}
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			await saveTopicArchivePolicy(data);
		}, () => {
			(async () => {
				await onConfirm(data);
				fireGlobal(EventTypes.HIDE_DIALOG);
			})();
		});
	};
	const onCancelClicked = () => {
		fireGlobal(EventTypes.HIDE_DIALOG);
	};

	const coldDaysOptions = [
		{value: '', label: 'Keep Forever'},
		...[365, 730, 1825, 3650].map(days => {
			return {value: days, label: `${days} Days`};
		})
	];
	const batchSizeOptions = [500, 1000, 5000, 10000, 50000].map(size => {
		return {value: size, label: `${size} Rows per Batch`};
	});
	// eslint-disable-next-line
	const topic = topics.find(topic => topic.topicId == data.topicId);

	// the topic data source itself is not archivable, archived data must be moved into another storage
	const dataSourceOptions = dataSources
		.filter(dataSource => topic == null || dataSource.dataSourceId !== topic.dataSourceId)
		.map(dataSource => {
			return {value: dataSource.dataSourceId, label: dataSource.name || 'Noname Data Source'};
		});

	return <>
		<DialogTitle>Topic Archive Policy [{topic?.name ?? 'Noname Topic'}]</DialogTitle>
		<DialogBody>
			<ResultRowEditor>
				<EditLabel>Archive Data Before (Days)</EditLabel>
				<Input value={hotDays} onChange={onHotDaysChange}/>
				<EditLabel>Cold Data Retention</EditLabel>
				<Dropdown value={coldDays ?? ''} options={coldDaysOptions} onChange={onColdDaysChange}/>
				<EditLabel>Batch Size</EditLabel>
				<Dropdown value={batchSize} options={batchSizeOptions} onChange={onBatchSizeChange}/>
				<EditLabel>Archive To Data Source</EditLabel>
				<Dropdown value={archiveDataSourceId} options={dataSourceOptions} onChange={onArchiveDataSourceChange}
				          please={dataSourceOptions.length === 0 ? 'No other data source, declare one first' : 'Pick a cold storage'}/>
				<EditLabel>Enabled</EditLabel>
				<CheckBox value={enabled} onChange={onEnabledChange}/>
				<EditLabel>Destroy Needs Approval</EditLabel>
				<CheckBox value={destroyRequiresApproval} onChange={onDestroyRequiresApprovalChange}/>
				<EditLabel>Filter By</EditLabel>
				<FilterContainer>
					{topic != null
						? <PolicyFilterEdit policy={data} topic={topic}/>
						: <AlertLabel>Topic not found, filter cannot be edited.</AlertLabel>}
				</FilterContainer>
			</ResultRowEditor>
		</DialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>Confirm</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCancelClicked}>Cancel</Button>
		</DialogFooter>
	</>;
};
