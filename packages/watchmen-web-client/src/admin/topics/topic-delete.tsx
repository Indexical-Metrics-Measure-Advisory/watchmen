import {fetchAllPipelines} from '@/services/data/pipeline/all-pipelines';
import {Pipeline} from '@/services/data/tuples/pipeline-types';
import {findPipelinesTriggerByTopic, findPipelinesWriteToTopic} from '@/services/data/tuples/pipeline-utils';
import {QueryTopic} from '@/services/data/tuples/query-topic-types';
import {fetchTopic, deleteTopic} from '@/services/data/tuples/topic';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {DialogBody, DialogFooter, DialogLabel} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';

const DeleteDialogBody = styled(DialogBody)`
	flex-direction : column;
	margin-bottom  : var(--margin);
`;
const NameUrl = styled.div`
	color       : var(--info-color);
	font-weight : var(--font-bold);
	padding-top : calc(var(--margin) / 2);
	word-break  : break-all;
	line-height : var(--line-height);
`;
const PipelineList = styled.div`
	display        : flex;
	flex-direction : column;
	margin-top     : calc(var(--margin) / 2);
	max-height     : 200px;
	overflow-y     : auto;
`;
const PipelineItem = styled.div`
	display     : flex;
	align-items : center;
	font-size   : 0.9em;
	padding     : 2px 0;
	> span:first-child {
		font-weight  : var(--font-bold);
		margin-right : 8px;
		color        : var(--warn-color);
	}
`;

export const TopicDelete = (props: { topic: QueryTopic, onRemoved: () => void }) => {
	const {topic: queryTopic, onRemoved} = props;

	const {fire} = useEventBus();
	const [pipelines, setPipelines] = useState<{ in: Array<Pipeline>, out: Array<Pipeline> }>({in: [], out: []});
	const [loading, setLoading] = useState(true);
	const hasRelatedPipelines = pipelines.in.length > 0 || pipelines.out.length > 0;
	const canDelete = !loading && !hasRelatedPipelines;

	useEffect(() => {
		(async () => {
			const {topic} = await fetchTopic(queryTopic.topicId);
			const allPipelines = await fetchAllPipelines();
			setPipelines({
				in: findPipelinesWriteToTopic(allPipelines, topic),
				out: findPipelinesTriggerByTopic(allPipelines, topic)
			});
			setLoading(false);
		})();
	}, [queryTopic.topicId]);

	const onDeleteClicked = async () => {
		if (!canDelete) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await deleteTopic(queryTopic.topicId),
			() => {
				fire(EventTypes.HIDE_DIALOG);
				onRemoved();
			});
	};
	const onCancelClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	return <>
		<DeleteDialogBody>
			<DialogLabel>Are you sure to delete topic? Please note that deletion cannot be recovered.</DialogLabel>
			<NameUrl>{queryTopic.name}</NameUrl>
			{loading
				? <DialogLabel>Loading related pipelines...</DialogLabel>
				: (hasRelatedPipelines
						? <>
							<DialogLabel style={{marginTop: 'calc(var(--margin) / 2)', color: 'var(--danger-color)'}}>
								Warning: The following pipelines will be affected!
							</DialogLabel>
							<DialogLabel style={{marginTop: 'calc(var(--margin) / 4)', color: 'var(--danger-color)'}}>
								Deletion is disabled when topic has IN/OUT pipelines.
							</DialogLabel>
							<PipelineList>
								{pipelines.in.map(p => <PipelineItem key={p.pipelineId}>
									<span>[IN]</span>
									<span>{p.name}</span>
								</PipelineItem>)}
								{pipelines.out.map(p => <PipelineItem key={p.pipelineId}>
									<span>[OUT]</span>
									<span>{p.name}</span>
								</PipelineItem>)}
							</PipelineList>
						</>
						: null
				)
			}
		</DeleteDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.DANGER} onClick={onDeleteClicked} disabled={!canDelete}>{Lang.ACTIONS.DELETE}</Button>
			<Button ink={ButtonInk.PRIMARY} onClick={onCancelClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};
