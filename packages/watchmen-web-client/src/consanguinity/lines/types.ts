import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity-types';

export enum LineType {
	OBJECTIVE_FACTOR_TO_TARGET = 'objective-factor-to-target',
	OBJECTIVE_FACTOR_BLOCK = 'objective-factor-block',
	INDICATOR_TO_OBJECTIVE_FACTOR = 'indicator-to-objective-factor',
	SUBJECT_TO_INDICATOR = 'subject-to-indicator',
	SAME_SUBJECT = 'subject',
	TOPIC_TO_INDICATOR = 'topic-to-indicator',
	TOPIC_TO_SUBJECT = 'topic-to-subject',
	TOPIC_BLOCK = 'topic-block',
	UNKNOWN = 'unknown'
}

export interface LineData {
	fromCid: ConsanguinityUniqueId;
	fromNode: HTMLElement;
	toCid: ConsanguinityUniqueId;
	toNode: HTMLElement;
	top: number;
	left: number;
	width: number;
	height: number;
	startX: number;
	startY: number;
	endX: number;
	endY: number;
	type: LineType;
}

export interface NodeRect {
	top: number;
	left: number;
	width: number;
	height: number;
	node: HTMLElement;
}

export type NodeRectMap = Record<ConsanguinityUniqueId, NodeRect>;

export interface LineSVG {
	line: string;
	start: string;
	end?: string;
}
