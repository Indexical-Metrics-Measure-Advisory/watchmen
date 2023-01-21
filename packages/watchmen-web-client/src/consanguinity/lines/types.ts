import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';

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
}
