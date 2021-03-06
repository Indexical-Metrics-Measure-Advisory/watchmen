import {Bucket} from '@/services/data/tuples/bucket-types';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {Pipeline} from '@/services/data/tuples/pipeline-types';
import {Space} from '@/services/data/tuples/space-types';
import {Subject} from '@/services/data/tuples/subject-types';
import {Topic} from '@/services/data/tuples/topic-types';

export interface Candidate {
	picked: boolean;
}

export interface TopicCandidate extends Candidate {
	topic: Topic;
}

export interface PipelineCandidate extends Candidate {
	pipeline: Pipeline;
}

export interface SpaceCandidate extends Candidate {
	space: Space;
}

export interface ConnectedSpaceCandidate extends Candidate {
	connectedSpace: ConnectedSpace;
}

export interface SubjectCandidate extends Candidate {
	subject: Subject;
}

export interface IndicatorCandidate extends Candidate {
	indicator: Indicator;
}

export interface BucketCandidate extends Candidate {
	bucket: Bucket;
}