import {MonitorRuleId} from '@/services/data/data-quality/rule-types';
import {ReportId} from '@/services/data/tuples/report-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {ConnectedSpaceId} from '../tuples/connected-space-types';
import {PipelineId} from '../tuples/pipeline-types';
import {SpaceId} from '../tuples/space-types';
import {TopicId} from '../tuples/topic-types';

export interface ImportDataResponse {
	passed: boolean;
	topics?: Array<{ topicId: TopicId; name: string; reason: string; passed: boolean }>;
	pipelines?: Array<{ pipelineId: PipelineId; name: string; reason: string; passed: boolean }>;
	spaces?: Array<{ spaceId: SpaceId; name: string; reason: string; passed: boolean }>;
	connectedSpaces?: Array<{ connectId: ConnectedSpaceId; name: string; reason: string; passed: boolean }>;
	subjects?: Array<{ subjectId: SubjectId; name: string; reason: string; passed: boolean }>;
	reports?: Array<{ reportId: ReportId; name: string; reason: string; passed: boolean }>;
	monitorRules?: Array<{ monitorRuleId: MonitorRuleId; name: string; reason: string; passed: boolean }>;
}