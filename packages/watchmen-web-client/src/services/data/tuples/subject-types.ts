import {DateTime} from '../types';
import {Parameter, ParameterCondition, ParameterExpression, ParameterJoint} from './factor-calculator-types';
import {FactorId} from './factor-types';
import {Report} from './report-types';
import {TopicId} from './topic-types';
import {Tuple} from './tuple-types';

export type SubjectDataSetColumnId = string;

export enum SubjectColumnArithmetic {
	NONE = 'none',
	COUNT = 'count',
	SUMMARY = 'sum',
	AVERAGE = 'avg',
	MAXIMUM = 'max',
	MINIMUM = 'min'
}

export enum SubjectColumnAlignment {
	LEFT = 'left',
	CENTER = 'center',
	RIGHT = 'right'
}

export enum SubjectColumnFormat {
	NONE = 'none',
	USE_GROUP = '#,##0',
	USE_GROUP_1 = '#,##0.0',
	USE_GROUP_2 = '#,##0.00',
	USE_GROUP_3 = '#,##0.000',
	USE_GROUP_4 = '#,##0.0000',
	USE_GROUP_5 = '#,##0.00000',
	USE_GROUP_6 = '#,##0.000000',
}

export interface SubjectDataSetColumnRenderer {
	alignment: SubjectColumnAlignment;
	format: SubjectColumnFormat;
	highlightNegative: boolean;
}

/** column */
export interface SubjectDataSetColumn {
	columnId: SubjectDataSetColumnId;
	parameter: Parameter;
	alias?: string;
	arithmetic?: SubjectColumnArithmetic;
	renderer?: SubjectDataSetColumnRenderer;
	recalculate?: boolean;
}

/** filter */
export interface SubjectDataSetFilter extends ParameterCondition {
}

export interface SubjectDataSetFilterJoint extends SubjectDataSetFilter, ParameterJoint {
	filters: Array<SubjectDataSetFilter>;
}

export interface SubjectDataSetFilterExpression extends SubjectDataSetFilter, ParameterExpression {
}

/** topic join */
export enum TopicJoinType {
	LEFT = 'left',
	RIGHT = 'right',
	INNER = 'inner',
}

export interface SubjectDataSetJoin {
	topicId: TopicId;
	factorId: FactorId;
	secondaryTopicId: TopicId;
	secondaryFactorId: FactorId;
	type: TopicJoinType;
}

export interface SubjectDataSet {
	filters: SubjectDataSetFilterJoint;
	columns: Array<SubjectDataSetColumn>;
	joins: Array<SubjectDataSetJoin>;
}

export type SubjectId = string;

export interface Subject extends Tuple {
	subjectId: SubjectId;
	name: string;
	autoRefreshInterval?: number;
	reports?: Array<Report>;
	dataset: SubjectDataSet;
	lastVisitTime: DateTime;
}
