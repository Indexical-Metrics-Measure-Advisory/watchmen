import {Consanguinity, ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {generateUuid} from '@/services/data/tuples/utils';
import {useEffect, useRef, useState} from 'react';
import {DiagramDataMap, DiagramRelation} from '../types';
import {LineData, LineSVG, NodeRect, NodeRectMap} from './types';
import {useNodeClick} from './use-node-click';
import {ConsanguinityLineContainer, ConsanguinityLinesContainer} from './widgets';

const ConsanguinityLine = (props: { data: LineData; compute: (data: LineData) => LineSVG }) => {
	const {data, compute} = props;

	const {active} = useNodeClick(data.fromCid, data.toCid);
	const {line, start, end} = compute(data);

	return <ConsanguinityLineContainer rect={data}
	                                   data-node-from-id={data.fromCid} data-node-to-id={data.toCid}
	                                   data-active={active}>
		<path data-type="line" d={line}/>
		<path data-type="start" d={start}/>
		{end != null ? <path data-type="end" d={end}/> : null}
	</ConsanguinityLineContainer>;
};

export const ConsanguinityLines = (props: {
	consanguinity: Consanguinity;
	relations: Array<DiagramRelation>;
	maps: DiagramDataMap;
	computeLines: (maps: DiagramDataMap, relations: Array<DiagramRelation>, nodes: NodeRectMap) => Array<LineData>;
	computeLine: (data: LineData) => LineSVG;
}) => {
	const {relations, maps, computeLines, computeLine} = props;

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
				top: top - parentTop, left: left - parentLeft, width, height, node
			} as NodeRect;
			return map;
		}, {} as Record<ConsanguinityUniqueId, NodeRect>);
		const data = computeLines(maps, relations, allNodes);
		setLines({painted: true, data: data});
		// eslint-disable-next-line
	}, [lines.painted]);

	return <ConsanguinityLinesContainer ref={ref}>
		{lines.data.map(line => {
			return <ConsanguinityLine data={line} compute={computeLine} key={generateUuid()}/>;
		})}
	</ConsanguinityLinesContainer>;
};