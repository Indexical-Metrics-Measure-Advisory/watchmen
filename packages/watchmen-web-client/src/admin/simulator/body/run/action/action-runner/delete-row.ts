import {isDeleteRowAction} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-utils';
import {DataRow} from '../../../../types';
import {computeJoint} from '../../compute/condition-compute';
import {ActionRuntimeContext, InternalUnitRuntimeContext, PipelineRuntimeContext} from '../../types';
import {prepareBy, prepareTopic} from './utils';

export const runDeleteRow = async (options: {
	pipelineContext: PipelineRuntimeContext,
	internalUnitContext: InternalUnitRuntimeContext,
	context: ActionRuntimeContext,
	logWrite: (message: string) => Promise<void>;
}) => {
	const {pipelineContext, internalUnitContext, context, logWrite} = options;
	const {action} = context;

	if (!isDeleteRowAction(action)) {
		throw new Error(`Not a delete row action[${action}].`);
	}

	const topic = prepareTopic(action, pipelineContext);
	const by = prepareBy(action);

	const rows = (pipelineContext.runtimeData[topic.topicId] || []).filter(fakeTriggerData => {
		return computeJoint({
			joint: by, pipelineContext, internalUnitContext, alternativeTriggerData: fakeTriggerData
		});
	});

	let deleted: boolean = false;
	let row: DataRow | null = null;
	if (rows && rows.length === 1) {
		row = rows[0];
		const index = (pipelineContext.runtimeData[topic.topicId] || []).findIndex(r => r === row);
		if (index !== -1) {
			deleted = true;
			(pipelineContext.runtimeData[topic.topicId] || []).splice(index, 1);
		}
	}

	if (deleted) {
		await logWrite(`Row[value=${JSON.stringify(row)}] deleted.`);
	} else {
		throw new Error('Row not found by given condition.');
		// await logWrite('Row not found by given condition.');
	}
};