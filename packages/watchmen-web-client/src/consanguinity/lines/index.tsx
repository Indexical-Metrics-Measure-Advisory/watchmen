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
import {LineData} from './types';
import {ConsanguinityLineContainer, ConsanguinityLinesContainer} from './widgets';

const ConsanguinityLine = (props: { data: LineData }) => {
	const {data} = props;

	const d = [
		`M ${data.startX} ${data.startY}`,
		`Q ${data.startX !== 0 ? data.startX - 32 : 32} ${data.startY}, ${data.width / 2} ${data.height / 2}`,
		`T ${data.endX} ${data.endY}`
	].join(' ');

	const startRadius = 5;

	return <ConsanguinityLineContainer rect={data} data-node-from-id={data.fromCid} data-node-to-id={data.toCid}>
		<path data-type="line" d={d}/>
		{data.startX < data.endX
			? <path data-type="start"
			        d={`M ${data.startX} ${data.startY - startRadius} A ${startRadius} ${startRadius} 0 0 1 ${data.startX} ${data.startY + startRadius} Z`}/>
			: <path data-type="start"
			        d={`M ${data.startX} ${data.startY - startRadius} A ${startRadius} ${startRadius} 0 0 0 ${data.startX} ${data.startY + startRadius} Z`}/>}
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
				fromCid: from, toCid: to,
				top: 0, left: 0, width: 0, height: 0, startX: 0, startY: 0, endX: 0, endY: 0
			};
			if (toNode.left + toNode.width < fromNode.left) {
				// to is at left of from
				lineData.left = toNode.left + toNode.width;
				lineData.width = fromNode.left - lineData.left;
				if (fromNode.top > toNode.top) {
					// from is at bottom
					lineData.top = toNode.top;
					lineData.height = fromNode.top + fromNode.height - lineData.top;
					lineData.endY = toNode.height / 2;
					lineData.startX = lineData.width;
					lineData.startY = lineData.height - fromNode.height / 2;
				} else {
					// from is same as to, or from is at top
					lineData.top = fromNode.top;
					lineData.height = toNode.top + toNode.height - lineData.top;
					lineData.endY = lineData.height - toNode.height / 2;
					lineData.startX = lineData.width;
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