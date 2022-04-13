import {Apis, post} from '../apis';
import {fetchMockMonitorLogs} from '../mock/admin/mock-logs';
import {PipelineStageId} from '../tuples/pipeline-stage-types';
import {
	DeleteTopicActionType,
	PipelineStageUnitActionId,
	PipelineStageUnitActionType,
	ReadTopicActionType,
	SystemActionType,
	WriteTopicActionType
} from '../tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {PipelineStageUnitId} from '../tuples/pipeline-stage-unit-types';
import {PipelineId} from '../tuples/pipeline-types';
import {TopicId} from '../tuples/topic-types';
import {DateTime} from '../types';
import {isMockService} from '../utils';

export interface MonitorLogCriteria {
	topicId?: TopicId;
	pipelineId?: PipelineId;
	startDate?: string;
	endDate?: string;
	status?: MonitorLogStatus;
	traceId?: string;
}

export enum MonitorLogStatus {
	DONE = 'DONE',
	ERROR = 'ERROR',
	IGNORED = 'IGNORED'
}

export type MonitorLogActionId = string;

export interface StandardMonitorLog {
	status: MonitorLogStatus;
	startTime: DateTime;
	spentInMills?: number;
	error?: string;
}

export interface ConditionalMonitorLog {
	prerequisite?: boolean;
	prerequisiteDefinedAs?: any;
}

export interface MonitorLogAction extends StandardMonitorLog {
	uid: MonitorLogActionId;
	actionId: PipelineStageUnitActionId;
	type: PipelineStageUnitActionType;
	insertCount: number;
	updateCount: number;
	deleteCount: number;
	definedAs?: any;
	touched: any;
}

export type FindBy = any;

export interface ReadAction extends MonitorLogAction {
	type: ReadTopicActionType;
	findBy: FindBy;
}

export interface WriteAction extends MonitorLogAction {
	type: WriteTopicActionType;
	findBy: FindBy;
}

export interface DeleteAction extends MonitorLogAction {
	type: DeleteTopicActionType;
	findBy: FindBy;
}

export interface AlarmAction extends MonitorLogAction, ConditionalMonitorLog {
	type: SystemActionType.ALARM;
}

export interface CopyToMemoryAction extends MonitorLogAction {
	type: SystemActionType.COPY_TO_MEMORY;
}

export interface WriteToExternalAction extends MonitorLogAction {
	type: SystemActionType.WRITE_TO_EXTERNAL;
}

export interface MonitorLogUnit extends StandardMonitorLog, ConditionalMonitorLog {
	unitId: PipelineStageUnitId;
	name: string;
	loopVariableName?: string;
	loopVariableValue?: any;
	actions: Array<MonitorLogAction>;
}

export interface MonitorLogStage extends StandardMonitorLog, ConditionalMonitorLog {
	stageId: PipelineStageId;
	name: string;
	units: Array<MonitorLogUnit>;
}

export interface MonitorLogRow extends StandardMonitorLog, ConditionalMonitorLog {
	uid: string;
	traceId: string;
	pipelineId: PipelineId;
	topicId: TopicId;
	dataId: string;
	oldValue?: any;
	newValue?: any;
	stages: Array<MonitorLogStage>;
}

export type MonitorLogs = Array<MonitorLogRow>;

export interface MonitorLogsDataPage {
	data: MonitorLogs;
	itemCount: number;
	pageNumber: number;
	pageSize: number;
	pageCount: number;
}

export const fetchMonitorLogs = async (options: {
	criteria: MonitorLogCriteria;
	pageNumber?: number;
	pageSize?: number;
}): Promise<MonitorLogsDataPage> => {
	if (isMockService()) {
		return await fetchMockMonitorLogs(options);
	} else {
		return post({
			api: Apis.QUERY_LOG,
			data: {...options.criteria, pageNumber: options.pageNumber, pageSize: options.pageSize}
		});
	}
};

export const isAlarmLog = (log: MonitorLogAction): log is AlarmAction => {
	return log.type === SystemActionType.ALARM;
};
export const isCopyToMemoryLog = (log: MonitorLogAction): log is CopyToMemoryAction => {
	return log.type === SystemActionType.COPY_TO_MEMORY;
};
export const isWriteToExternalLog = (log: MonitorLogAction): log is WriteToExternalAction => {
	return log.type === SystemActionType.WRITE_TO_EXTERNAL;
};
export const isReadLog = (log: MonitorLogAction): log is ReadAction => {
	return (
		ReadTopicActionType.EXISTS === log.type ||
		ReadTopicActionType.READ_ROW === log.type ||
		ReadTopicActionType.READ_FACTOR === log.type
	);
};
export const isWriteLog = (log: MonitorLogAction): log is WriteAction => {
	return (
		WriteTopicActionType.WRITE_FACTOR === log.type ||
		WriteTopicActionType.INSERT_ROW === log.type ||
		WriteTopicActionType.MERGE_ROW === log.type ||
		WriteTopicActionType.INSERT_OR_MERGE_ROW === log.type
	);
};
export const isDeleteLog = (log: MonitorLogAction): log is ReadAction => {
	return (
		DeleteTopicActionType.DELETE_ROW === log.type ||
		DeleteTopicActionType.DELETE_ROWS === log.type
	);
};
