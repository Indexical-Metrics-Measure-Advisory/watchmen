import {
	deleteTopicArchivePolicy,
	runTopicArchive
} from '@/services/data/admin/topic-archive';
import {TopicArchivePolicy, TopicArchiveResult} from '@/services/data/tuples/topic-archive-types';
import {DataSource} from '@/services/data/tuples/data-source-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {DwarfButton} from '@/widgets/basic/button';
import {ICON_DELETE, ICON_EDIT, ICON_PLAY} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {EditDialog} from './edit-dialog';
import {ResultActionButtons, ResultBodyCell, ResultBodyRow} from './widgets';

const asRunResultAlert = (result: TopicArchiveResult) => {
	if (result.dryRun) {
		return <AlertLabel>
			{`Dry run: ${result.totalRows} rows inserted before ${result.cutoffTime ?? '-'} will be archived, ${result.plannedBatches} batch(es) planned. Nothing has been changed.`}
		</AlertLabel>;
	}
	const archivedRows = (result.batches || []).reduce((count, batch) => count + (batch.rowCount || 0), 0);
	return <AlertLabel>
		{`Archived ${archivedRows} rows in ${(result.batches || []).length} batch(es).`}
	</AlertLabel>;
};

export const PolicyRow = (props: {
	policy: TopicArchivePolicy;
	index: number;
	topics: Array<Topic>;
	dataSources: Array<DataSource>;
	onChanged: () => Promise<void>;
}) => {
	const {policy, index, topics, dataSources, onChanged} = props;
	const {topicId} = policy;

	const {fire: fireGlobal} = useEventBus();

	const onDryRunClicked = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await runTopicArchive(policy, true);
		}, (result: TopicArchiveResult) => {
			fireGlobal(EventTypes.SHOW_ALERT, asRunResultAlert(result));
		});
	};
	const onArchiveClicked = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await runTopicArchive(policy, false);
		}, async (result: TopicArchiveResult) => {
			fireGlobal(EventTypes.SHOW_ALERT, asRunResultAlert(result));
			await onChanged();
		});
	};
	const onEditConfirmed = async () => {
		await onChanged();
	};
	const onEditClicked = () => {
		fireGlobal(EventTypes.SHOW_DIALOG,
			<EditDialog policy={policy} topics={topics} dataSources={dataSources} onConfirm={onEditConfirmed}/>,
			{
				marginTop: '10vh',
				marginLeft: '20%',
				width: '60%',
				height: '80vh'
			});
	};
	const onDeleteClicked = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			await deleteTopicArchivePolicy(policy);
		}, async () => {
			await onChanged();
		});
	};

	// eslint-disable-next-line
	const topic = topics.find(topic => topic.topicId == topicId);
	const topicName = topic?.name || 'Noname Topic';

	return <ResultBodyRow>
		<ResultBodyCell>{index}</ResultBodyCell>
		<ResultBodyCell>{topicName}</ResultBodyCell>
		<ResultBodyCell>{`${policy.hotDays} days`}</ResultBodyCell>
		<ResultBodyCell>{policy.batchSize}</ResultBodyCell>
		<ResultBodyCell>{policy.enabled ? 'Y' : 'N'}</ResultBodyCell>
		<ResultBodyCell>
			<ResultActionButtons>
				<DwarfButton ink={ButtonInk.PRIMARY} onClick={onDryRunClicked} title="Dry Run, nothing will be changed">
					<FontAwesomeIcon icon={ICON_PLAY}/>
				</DwarfButton>
				<DwarfButton ink={ButtonInk.DANGER} onClick={onArchiveClicked} title="Archive Now">
					<FontAwesomeIcon icon={ICON_PLAY}/>
				</DwarfButton>
				<DwarfButton onClick={onEditClicked}>
					<FontAwesomeIcon icon={ICON_EDIT}/>
				</DwarfButton>
				<DwarfButton ink={ButtonInk.WAIVE} onClick={onDeleteClicked}>
					<FontAwesomeIcon icon={ICON_DELETE}/>
				</DwarfButton>
			</ResultActionButtons>
		</ResultBodyCell>
	</ResultBodyRow>;
};
