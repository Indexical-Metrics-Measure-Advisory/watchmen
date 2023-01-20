import {Consanguinity, ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
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
		// `H 16`,
		`Q ${data.width / 2 + 16} ${data.startY}, ${data.width / 2 - 8} ${Math.abs(data.startY - data.endY) / 2 + data.endY}`,
		`T ${data.endX} ${data.endY}`].join(' ');

	return <ConsanguinityLineContainer rect={data}>
		<path d={d}/>
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
			const lineData: LineData = {top: 0, left: 0, width: 0, height: 0, startX: 0, startY: 0, endX: 0, endY: 0};
			if (toNode.left + toNode.width < fromNode.left) {
				lineData.left = toNode.left + toNode.width;
				lineData.width = fromNode.left - lineData.left;
				if (fromNode.top > toNode.top) {
					lineData.top = toNode.top;
					lineData.height = fromNode.top + fromNode.height - lineData.top;
					lineData.startY = lineData.height - fromNode.height / 2;
					lineData.endX = lineData.width;
					lineData.endY = toNode.height / 2;
				} else {
					lineData.top = fromNode.top;
					lineData.height = toNode.top + toNode.height - lineData.top;
					lineData.startY = lineData.height - toNode.height / 2;
					lineData.endX = lineData.width;
					lineData.endY = fromNode.height / 2;
				}
			}
			return lineData;
		});
		setLines({painted: true, data: data.filter(line => line != null) as Array<LineData>});
		// eslint-disable-next-line
	}, [lines.painted]);

	return <ConsanguinityLinesContainer ref={ref}>
		{lines.data.map(line => {
			return <ConsanguinityLine data={line}/>;
		})}
	</ConsanguinityLinesContainer>;
};