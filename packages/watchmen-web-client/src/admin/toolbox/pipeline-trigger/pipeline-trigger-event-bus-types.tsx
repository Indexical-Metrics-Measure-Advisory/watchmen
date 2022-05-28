import {TriggerTopicFilter} from '@/admin/toolbox/pipeline-trigger/types';

export enum PipelineTriggerEventTypes {
	TRIGGER_ADDED = 'trigger-added'
}

export interface PipelineTriggerEventBus {
	fire(type: PipelineTriggerEventTypes.TRIGGER_ADDED, trigger: TriggerTopicFilter): this;
	on(type: PipelineTriggerEventTypes.TRIGGER_ADDED, listener: (trigger: TriggerTopicFilter) => void): this;
	off(type: PipelineTriggerEventTypes.TRIGGER_ADDED, listener: (trigger: TriggerTopicFilter) => void): this;
}