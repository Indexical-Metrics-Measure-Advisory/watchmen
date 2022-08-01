import {Enum} from './enum-types';
import {Indicator} from './indicator-types';
import {Subject} from './subject-types';
import {Topic} from './topic-types';

export type QueryIndicator = Pick<Indicator, 'indicatorId' | 'name' | 'description' | 'createdAt' | 'lastModifiedAt'>;
export type TopicForIndicator = Pick<Topic, 'topicId' | 'name' | 'type' | 'factors'>;
export type SubjectForIndicator = Pick<Subject, 'subjectId' | 'name' | 'dataset'> & { topics: Array<Topic> };
export type EnumForIndicator = Pick<Enum, 'enumId' | 'name'>;

export type QueryIndicatorCategoryParams = [] | [string] | [string, string];
