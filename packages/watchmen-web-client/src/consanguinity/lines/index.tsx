import {Consanguinity, ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {generateUuid} from '@/services/data/tuples/utils';
import {useEffect, useRef, useState} from 'react';
import {
	DiagramIndicatorMap,
	DiagramObjectiveFactorMap,
	DiagramObjectiveTargetMap,
	DiagramSubjectColumnMap,
	DiagramTopicFactorMap
} from '../types';
import {getRelations} from '../utils';
import {LineData, LineType} from './types';
import {useNodeClick} from './use-node-click';
import {ConsanguinityLineContainer, ConsanguinityLinesContainer} from './widgets';

const computeD = (data: LineData) => {
	const startRadius = 5;
	if (data.type === LineType.RIGHT_TO_LEFT) {
		return {
			line: [
				`M ${data.startX} ${data.startY}`,
				`Q ${data.startX < data.endX
					? (data.startX + (data.endX - data.startX) / 3)
					: (data.startX - (data.startX - data.endX) / 3)} ${data.startY}, ${data.width / 2} ${Math.min(data.startY, data.endY) + Math.abs(data.startY - data.endY) / 2}`,
				`T ${data.endX} ${data.endY}`
			].join(' '),
			start: data.startX < data.endX
				? `M ${data.startX} ${data.startY - startRadius} A ${startRadius} ${startRadius} 0 0 1 ${data.startX} ${data.startY + startRadius} Z`
				: `M ${data.startX} ${data.startY - startRadius} A ${startRadius} ${startRadius} 0 0 0 ${data.startX} ${data.startY + startRadius} Z`
		};
	} else if (data.type === LineType.SAME_BLOCK) {
		return {
			line: [
				data.startY < data.endY ? `M ${data.startX} ${data.startY + 1}` : `M ${data.startX} ${data.startY - 1}`,
				data.startY < data.endY ? `L ${data.startX} ${data.startY + 10}` : `L ${data.startX} ${data.startY - 10}`,
				data.startY < data.endY ? `A 10 10 0 0 0 ${data.startX + 10} ${data.startY + 16}` : `A 10 10 0 0 1 ${data.startX + 10} ${data.startY - 16}`,
				data.startY < data.endY ? `L ${data.endX - 32} ${data.startY + 16}` : `L ${data.endX - 32} ${data.startY - 16}`,
				data.startY < data.endY
					? `Q ${data.endX + 112} ${data.startY + 16}, ${data.endX + 1} ${data.endY}`
					: `Q ${data.endX + 112} ${data.startY - 16}, ${data.endX + 1} ${data.endY}`
			].join(' '),
			start: data.startY < data.endY
				? `M ${data.startX - startRadius} ${data.startY} A ${startRadius} ${startRadius} 0 0 0 ${data.startX + startRadius} ${data.startY} Z`
				: `M ${data.startX - startRadius} ${data.startY} A ${startRadius} ${startRadius} 0 0 1 ${data.startX + startRadius} ${data.startY} Z`
		};
	} else {
		return {line: '', start: ''};
	}
};
const ConsanguinityLine = (props: { data: LineData }) => {
	const {data} = props;

	const {active} = useNodeClick(data.fromCid, data.toCid);
	const {line, start} = computeD(data);

	return <ConsanguinityLineContainer rect={data}
	                                   data-node-from-id={data.fromCid} data-node-to-id={data.toCid}
	                                   data-active={active}>
		<path data-type="line" d={line}/>
		<path data-type="start" d={start}/>
	</ConsanguinityLineContainer>;
};

export const ConsanguinityLines = (props: {
	consanguinity: Consanguinity;
	maps: {
		objectiveTargetMap: DiagramObjectiveTargetMap;
		objectiveFactorMap: DiagramObjectiveFactorMap;
		indicatorMap: DiagramIndicatorMap;
		subjectColumnMap: DiagramSubjectColumnMap;
		topicFactorMap: DiagramTopicFactorMap;
	}
}) => {
	const {consanguinity} = props;

	const ref = useRef<HTMLDivElement>(null);
	const [lines, setLines] = useState<{ painted: boolean; data: Array<LineData> }>({painted: false, data: []});
	useEffect(() => {
		if (lines.painted || ref.current == null) {
			return;
		}

		const parent = ref.current.parentElement as HTMLDivElement;
		const {top: parentTop, left: parentLeft} = parent.getBoundingClientRect();
		const allNodes = Array.from(parent.querySelectorAll<HTMLDivElement>('div[data-node-id]')).reduce((map, node) => {
			const {top, left, width, height} = node.getBoundingClientRect();
			map[(node as HTMLDivElement).getAttribute('data-node-id')!] = {
				top: top - parentTop, left: left - parentLeft, width, height
			};
			return map;
		}, {} as Record<ConsanguinityUniqueId, { top: number, left: number, width: number, height: number }>);
		const data = getRelations(consanguinity).map(({from, to}) => {
			const fromNode = allNodes[from];
			const toNode = allNodes[to];
			if (!fromNode || !toNode) {
				return null;
			}
			const lineData: LineData = {
				type: LineType.SAME_BLOCK, fromCid: from, toCid: to,
				top: 0, left: 0, width: 0, height: 0, startX: 0, startY: 0, endX: 0, endY: 0
			};
			if (toNode.left === fromNode.left) {
				lineData.type = LineType.SAME_BLOCK;
				lineData.left = fromNode.left;
				lineData.width = 2000;
				lineData.startX = fromNode.width / 2;
				lineData.endX = toNode.width;
				if (fromNode.top > toNode.top) {
					// from is at bottom
					lineData.top = toNode.top;
					lineData.height = fromNode.top + fromNode.height - lineData.top;
					lineData.startY = lineData.height - fromNode.height;
					// end position is bottom right corner
					lineData.endY = toNode.height / 2;
				} else {
					lineData.top = fromNode.top;
					lineData.height = toNode.top + toNode.height - lineData.top;
					lineData.startY = fromNode.height;
					// end position is top right corner
					lineData.endY = lineData.height - toNode.height / 2;
				}
			} else if (toNode.left + toNode.width < fromNode.left) {
				// to is at left of from
				lineData.type = LineType.RIGHT_TO_LEFT;
				lineData.left = toNode.left + toNode.width;
				lineData.width = fromNode.left - lineData.left;
				lineData.startX = lineData.width;
				lineData.endX = 0;
				if (fromNode.top > toNode.top) {
					// from is at bottom
					lineData.top = toNode.top;
					lineData.height = fromNode.top + fromNode.height - lineData.top;
					lineData.endY = toNode.height / 2;
					lineData.startY = lineData.height - fromNode.height / 2;
				} else {
					// from is same as to, or from is at top
					lineData.top = fromNode.top;
					lineData.height = toNode.top + toNode.height - lineData.top;
					lineData.endY = lineData.height - toNode.height / 2;
					lineData.startY = fromNode.height / 2;
				}
			}
			return lineData;
		});
		setLines({painted: true, data: data.filter(line => line != null) as Array<LineData>});
		// eslint-disable-next-line
	}, [lines.painted]);

	return <ConsanguinityLinesContainer ref={ref}>
		{lines.data.map(line => {
			return <ConsanguinityLine data={line} key={generateUuid()}/>;
		})}
	</ConsanguinityLinesContainer>;
};