import {isDeleteLog, MonitorLogAction} from '@/services/data/admin/logs';
import {DeleteTopicAction} from '@/services/data/tuples/pipeline-stage-unit-action/delete-topic-actions-types';
import {
	DeleteTopicActionType,
	PipelineStageUnitAction
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {isDeleteTopicAction} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {Topic} from '@/services/data/tuples/topic-types';
import {isMockService} from '@/services/data/utils';
import {ImpactDeleteRows} from './impact-rows';
import {toDisplayBy, toDisplayValue} from './utils';
import {BodyLabel, BodyValue, ObjectValue} from './widgets';

const redressAction = (action: any): DeleteTopicAction => {
	return (isMockService()
		? {
			type: DeleteTopicActionType.DELETE_ROW,
			...action
		}
		: action) as DeleteTopicAction;
};

export const DeleteActionLog = (props: {
	action: PipelineStageUnitAction;
	log: MonitorLogAction;
	topicsMap: Map<string, Topic>
}) => {
	const {log, topicsMap} = props;
	let {action} = props;
	action = redressAction(action);

	if (!isDeleteLog(log) || !isDeleteTopicAction(action)) {
		return null;
	}

	const {touched, findBy} = log;
	const displayValue = toDisplayValue(touched);
	const displayBy = toDisplayBy(findBy);

	let target;
	const topic = topicsMap.get(action.topicId);
	target = topic?.name || '?';

	const valueIsObject = displayValue.startsWith('[') || displayValue.startsWith('{');
	const byIsObject = displayBy.startsWith('[') || displayBy.startsWith('{');

	return <>
		<ImpactDeleteRows log={log}/>
		<BodyLabel>Delete From</BodyLabel>
		<BodyValue>{target}</BodyValue>
		<BodyLabel>Delete Content</BodyLabel>
		{valueIsObject
			? <ObjectValue value={displayValue} readOnly={true}/>
			: <BodyValue>{displayValue}</BodyValue>}
		<BodyLabel>Matched By</BodyLabel>
		{byIsObject
			? <ObjectValue value={displayBy} readOnly={true}/>
			: <BodyValue>{displayBy}</BodyValue>}
	</>;
};