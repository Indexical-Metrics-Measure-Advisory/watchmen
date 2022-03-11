import {isWriteToExternalLog, MonitorLogAction} from '@/services/data/admin/logs';
import {
	PipelineStageUnitAction,
	SystemActionType
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {
	isWriteToExternalAction
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {WriteToExternalAction} from '@/services/data/tuples/pipeline-stage-unit-action/system-actions-types';
import {isMockService} from '@/services/data/utils';
import {toDisplayValue} from './utils';
import {BodyLabel, BodyValue} from './widgets';

const redressAction = (action: any): WriteToExternalAction => {
	return (isMockService()
		? {
			type: SystemActionType.WRITE_TO_EXTERNAL,
			...action
		}
		: action) as WriteToExternalAction;
};

export const WriteToExternalLog = (props: {
	action: PipelineStageUnitAction;
	log: MonitorLogAction
}) => {
	const {log} = props;
	let {action} = props;
	action = redressAction(action);

	if (!isWriteToExternalLog(log) || !isWriteToExternalAction(action)) {
		return null;
	}

	const {touched} = log;
	const displayValue = toDisplayValue(touched);

	return <>
		<BodyLabel>{action.externalWriterId} ↢</BodyLabel>
		<BodyValue>{displayValue}</BodyValue>
	</>;
};