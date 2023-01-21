import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';

export enum LineType {
	RIGHT_TO_LEFT = 'right-to-left',
	SAME_BLOCK = 'same-block'
}

export interface LineData {
	fromCid: ConsanguinityUniqueId;
	toCid: ConsanguinityUniqueId;
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
