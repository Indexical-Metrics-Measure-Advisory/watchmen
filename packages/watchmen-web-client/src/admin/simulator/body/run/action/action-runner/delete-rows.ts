import {isDeleteRowsAction} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {computeJoint} from '../../compute/condition-compute';
import {ActionRuntimeContext, InternalUnitRuntimeContext, PipelineRuntimeContext} from '../../types';
import {prepareBy, prepareTopic} from './utils';

export const runDeleteRows = async (options: {
	pipelineContext: PipelineRuntimeContext,
	internalUnitContext: InternalUnitRuntimeContext,
	context: ActionRuntimeContext,
	logWrite: (message: string) => Promise<void>;
}) => {
	const {pipelineContext, internalUnitContext, context, logWrite} = options;
	const {action} = context;

	if (!isDeleteRowsAction(action)) {
		throw new Error(`Not a delete rows action[${action}].`);
	}

	const topic = prepareTopic(action, pipelineContext);
	const by = prepareBy(action);

	const rows = (pipelineContext.runtimeData[topic.topicId] || []).filter(fakeTriggerData => {
		return computeJoint({
			joint: by, pipelineContext, internalUnitContext, alternativeTriggerData: fakeTriggerData
		});
	});

	if (rows && rows.length > 0) {
		rows.forEach(row => {
			const index = (pipelineContext.runtimeData[topic.topicId] || []).findIndex(r => r === row);
			if (index !== -1) {
				(pipelineContext.runtimeData[topic.topicId] || []).splice(index, 1);
			}
		});
	}

	await logWrite(`Rows[value=${JSON.stringify(rows)}] deleted.`);
};