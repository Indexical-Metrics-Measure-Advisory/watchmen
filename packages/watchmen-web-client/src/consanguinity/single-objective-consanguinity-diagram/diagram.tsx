import {Consanguinity, ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {fetchConsanguinity} from '@/services/data/tuples/objective';
import {Objective} from '@/services/data/tuples/objective-types';
import {Button} from '@/widgets/basic/button';
import {ICON_LOADING} from '@/widgets/basic/constants';
import {DialogFooter} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {RefObject, useEffect, useRef, useState} from 'react';
import {ConsanguinityActivation} from '../activation';
// noinspection ES6PreferShortImport
import {ConsanguinityEventBusProvider} from '../consanguinity-event-bus';
import {ConsanguinityLines} from '../lines';
import {LineData, LineSVG, LineType, NodeRectMap} from '../lines/types';
import {IndicatorNode, ObjectiveFactorNode, ObjectiveTargetNode, SubjectNode, TopicNode} from '../nodes';
import {
	DiagramDataMap,
	DiagramIndicatorList,
	DiagramIndicatorMap,
	DiagramObjectiveFactorList,
	DiagramObjectiveFactorMap,
	DiagramObjectiveTargetList,
	DiagramObjectiveTargetMap,
	DiagramRelation,
	DiagramSubjectColumnMap,
	DiagramSubjectList,
	DiagramTopicFactorMap,
	DiagramTopicList
} from '../types';
import {getIndicators, getObjectiveFactors, getObjectiveTargets, getRelations, getSubjects, getTopics} from '../utils';
import {ConsanguinityBlockContainer, ConsanguinityBlockLabel} from '../widgets';
import {
	ConsanguinityDialogBody,
	Loading,
	ObjectiveConsanguinityBlockBody,
	ObjectiveConsanguinityDiagram
} from './widgets';

interface State {
	loaded: boolean;
	data?: Consanguinity;
	relations: Array<DiagramRelation>;
	maps: {
		targets: { list: DiagramObjectiveTargetList, map: DiagramObjectiveTargetMap },
		factors: { list: DiagramObjectiveFactorList, map: DiagramObjectiveFactorMap },
		indicators: { list: DiagramIndicatorList, map: DiagramIndicatorMap },
		subjects: { list: DiagramSubjectList, map: DiagramSubjectColumnMap },
		topics: { list: DiagramTopicList, map: DiagramTopicFactorMap }
	};
}

const computeLineType = (maps: DiagramDataMap, fromCid: ConsanguinityUniqueId, toCid: ConsanguinityUniqueId): LineType => {
	if (maps.factors[fromCid] != null) {
		if (maps.targets[toCid] != null) {
			return LineType.OBJECTIVE_FACTOR_TO_TARGET;
		} else {
			return LineType.OBJECTIVE_FACTOR_BLOCK;
		}
	} else if (maps.indicators[fromCid] != null) {
		return LineType.INDICATOR_TO_OBJECTIVE_FACTOR;
	} else if (maps.subjectColumns[fromCid] != null) {
		if (maps.indicators[toCid] != null) {
			return LineType.SUBJECT_TO_INDICATOR;
		} else {
			return LineType.SAME_SUBJECT;
		}
	} else if (maps.topicFactors[fromCid] != null) {
		if (maps.indicators[toCid] != null) {
			return LineType.TOPIC_TO_INDICATOR;
		} else if (maps.subjectColumns[toCid] != null) {
			return LineType.TOPIC_TO_SUBJECT;
		} else {
			return LineType.TOPIC_BLOCK;
		}
	} else {
		return LineType.UNKNOWN;
	}
};

const computeLines = (maps: DiagramDataMap, relations: Array<DiagramRelation>, nodes: NodeRectMap) => {
	return relations.map(({from, to}) => {
		const fromNode = nodes[from];
		const toNode = nodes[to];
		if (!fromNode || !toNode) {
			return null;
		}
		const lineData: LineData = {
			type: computeLineType(maps, from, to), fromCid: from, toCid: to,
			top: 0, left: 0, width: 0, height: 0, startX: 0, startY: 0, endX: 0, endY: 0
		};
		switch (lineData.type) {
			case LineType.OBJECTIVE_FACTOR_BLOCK:
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
				break;
			case LineType.OBJECTIVE_FACTOR_TO_TARGET:
			case LineType.INDICATOR_TO_OBJECTIVE_FACTOR:
			case LineType.SUBJECT_TO_INDICATOR:
				// to is at left of from
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
				break;
			case LineType.SAME_SUBJECT:
				break;
			case LineType.TOPIC_TO_INDICATOR:
				lineData.top = toNode.top;
				lineData.height = fromNode.top + fromNode.height - toNode.top;
				lineData.startY = lineData.height - fromNode.height / 2;
				lineData.endY = toNode.height / 2;
				if (fromNode.left < toNode.left - 16) {
					lineData.left = fromNode.left + fromNode.width;
					lineData.width = toNode.left + toNode.width - lineData.left + 200;
					lineData.startX = 0;
					lineData.endX = toNode.left + toNode.width - lineData.left;
				} else if (fromNode.left > toNode.left + 16) {
					lineData.left = toNode.left + toNode.width;
					lineData.width = fromNode.left + fromNode.width - lineData.left + 200;
					lineData.startX = fromNode.left + fromNode.width - lineData.left;
					lineData.endX = 0;
				} else {
					lineData.left = fromNode.left + fromNode.width;
					lineData.width = 200;
					lineData.startX = 0;
					lineData.endX = toNode.left + toNode.width - lineData.left;
				}
				break;
			case LineType.TOPIC_TO_SUBJECT:
				lineData.top = toNode.top;
				lineData.left = fromNode.left + fromNode.width;
				lineData.width = toNode.left + toNode.width + 200;
				lineData.height = fromNode.top + fromNode.height - toNode.top;
				lineData.startX = 0;
				lineData.startY = lineData.height - fromNode.height / 2;
				lineData.endX = toNode.left + toNode.width - lineData.left;
				lineData.endY = toNode.height / 2;
				break;
			case LineType.TOPIC_BLOCK:
				break;
			case LineType.UNKNOWN:
				break;
		}
		return lineData;
	}).filter(x => x != null) as Array<LineData>;
};

const buildComputeLine = (topicRef: RefObject<HTMLDivElement>) => {
	return (data: LineData): LineSVG => {
		const startRadius = 5;
		switch (data.type) {
			case LineType.OBJECTIVE_FACTOR_BLOCK:
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
			case LineType.OBJECTIVE_FACTOR_TO_TARGET:
			case LineType.INDICATOR_TO_OBJECTIVE_FACTOR:
			case LineType.SUBJECT_TO_INDICATOR:
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
			case LineType.SAME_SUBJECT:
				return {line: '', start: ''};
			case LineType.TOPIC_TO_INDICATOR: {
				if (topicRef.current == null) {
					return {line: '', start: ''};
				}
				const parent = topicRef.current.parentElement!;
				const topicBlockTop = topicRef.current.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop - data.top - 2;

				const startX = data.startX + 16;
				return {
					line: [
						`M ${data.startX + 1} ${data.startY}`,
						startX !== data.endX ? `L ${data.startX + 40} ${data.startY}` : `L ${data.endX + 24} ${data.startY}`,
						startX !== data.endX
							? `A 16 16 0 0 0 ${data.startX + 56} ${data.startY - 16}`
							: `A 16 16 0 0 0 ${data.endX + 40} ${data.startY - 16}`,
						startX !== data.endX ? `L ${data.startX + 56} ${topicBlockTop}` : `L ${data.endX + 40} ${topicBlockTop}`,
						startX > data.endX
							? `A 16 16 0 0 0 ${data.startX + 40} ${topicBlockTop - 16}`
							: (startX < data.endX ? `A 16 16 0 0 1 ${data.startX + 72} ${topicBlockTop - 16}` : ''),
						startX > data.endX
							? `L ${data.endX + 56} ${topicBlockTop - 16}`
							: (startX < data.endX ? `L ${data.endX + 24} ${topicBlockTop - 16}` : ''),
						startX > data.endX
							? `A 16 16 0 0 1 ${data.endX + 40} ${topicBlockTop - 32}`
							: (startX < data.endX ? `A 16 16 0 0 0 ${data.endX + 40} ${topicBlockTop - 32}` : ''),
						`L ${data.endX + 40} ${data.endY + 16}`,
						`A 16 16 0 0 0 ${data.endX + 24} ${data.endY}`,
						`L ${data.endX + 1} ${data.endY}`
					].join(' '),
					start: `M ${data.startX} ${data.startY - startRadius} A ${startRadius} ${startRadius} 0 0 1 ${data.startX} ${data.startY + startRadius} Z`
				};
			}
			case LineType.TOPIC_TO_SUBJECT: {
				if (topicRef.current == null) {
					return {line: '', start: ''};
				}
				const parent = topicRef.current.parentElement!;
				const topicBlockTop = topicRef.current.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop - data.top + 30;
				return {
					line: [
						`M ${data.startX + 1} ${data.startY}`,
						`L ${data.startX + 56} ${data.startY}`,
						`A 16 16 0 0 0 ${data.startX + 72} ${data.startY - 16}`,
						`L ${data.startX + 72} ${topicBlockTop - 16}`,
						data.startX !== data.endX ? `A 16 16 0 0 1 ${data.startX + 88} ${topicBlockTop - 32}` : '',
						data.startX !== data.endX ? `L ${data.endX + 56} ${topicBlockTop - 32}` : '',
						data.startX !== data.endX ? `A 16 16 0 0 0 ${data.endX + 72} ${topicBlockTop - 48}` : '',
						`L ${data.endX + 72} ${data.endY + 16}`,
						`A 16 16 0 0 0 ${data.endX + 56} ${data.endY}`,
						`L ${data.endX} ${data.endY}`
					].join(' '),
					start: `M ${data.startX} ${data.startY - startRadius} A ${startRadius} ${startRadius} 0 0 1 ${data.startX} ${data.startY + startRadius} Z`
				};
			}
			case LineType.TOPIC_BLOCK:
			case LineType.UNKNOWN:
				return {line: '', start: ''};
		}
	};
};

export const SingleObjectiveConsanguinityDiagram = (props: { objective: Objective }) => {
	const {objective} = props;

	const topicRef = useRef<HTMLDivElement>(null);
	const {fire} = useEventBus();
	const [state, setState] = useState<State>({
		loaded: false, relations: [], maps: {
			targets: {list: [], map: {}},
			factors: {list: [], map: {}},
			indicators: {list: [], map: {}},
			subjects: {list: [], map: {}},
			topics: {list: [], map: {}}
		}
	});
	useEffect(() => {
		if (state.loaded) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => fetchConsanguinity(objective),
			(consanguinity: Consanguinity) => setState({
				loaded: true, data: consanguinity, relations: getRelations(consanguinity), maps: {
					targets: getObjectiveTargets(consanguinity),
					factors: getObjectiveFactors(consanguinity),
					indicators: getIndicators(consanguinity),
					subjects: getSubjects(consanguinity),
					topics: getTopics(consanguinity)
				}
			}));
	}, [fire, state.loaded, objective]);

	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	if (!state.loaded) {
		return <>
			<ConsanguinityDialogBody>
				<Loading>
					<FontAwesomeIcon icon={ICON_LOADING} spin={true}/>
					<span>{Lang.PLAIN.LOADING}</span>
				</Loading>
			</ConsanguinityDialogBody>
			<DialogFooter>
				<Button onClick={onCloseClicked}>{Lang.ACTIONS.CLOSE}</Button>
			</DialogFooter>
		</>;
	}

	if (state.maps.targets.list.length === 0) {
		return <>
			<ConsanguinityDialogBody>
				<Loading>
					<span>{Lang.CONSANGUINITY.NO_OBJECTIVE_TARGET_FOUND}</span>
				</Loading>
			</ConsanguinityDialogBody>
			<DialogFooter>
				<Button onClick={onCloseClicked}>{Lang.ACTIONS.CLOSE}</Button>
			</DialogFooter>
		</>;
	}

	const maps = {
		targets: state.maps.targets.map,
		factors: state.maps.factors.map,
		indicators: state.maps.indicators.map,
		subjectColumns: state.maps.subjects.map,
		topicFactors: state.maps.topics.map
	};

	return <ConsanguinityEventBusProvider>
		<ConsanguinityDialogBody>
			<ObjectiveConsanguinityDiagram>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.OBJECTIVE_TARGET_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{state.maps.targets.list.map(target => {
							return <ObjectiveTargetNode data={target} key={target['@cid']}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.OBJECTIVE_FACTOR_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{state.maps.factors.list.map(factor => {
							return <ObjectiveFactorNode data={factor} key={factor['@cid']}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.INDICATOR_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{state.maps.indicators.list.map(indicator => {
							return <IndicatorNode data={indicator} key={indicator['@cid']}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.SUBJECT_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{state.maps.subjects.list.map(subject => {
							return <SubjectNode data={subject} key={subject.subjectId}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer ref={topicRef}>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.TOPIC_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{state.maps.topics.list.map(topic => {
							return <TopicNode data={topic} key={topic.topicId}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityLines consanguinity={state.data!} relations={state.relations}
				                    computeLines={computeLines} computeLine={buildComputeLine(topicRef)} maps={maps}/>
				<ConsanguinityActivation consanguinity={state.data!} relations={state.relations} maps={maps}/>
			</ObjectiveConsanguinityDiagram>
		</ConsanguinityDialogBody>
		<DialogFooter>
			<Button onClick={onCloseClicked}>{Lang.ACTIONS.CLOSE}</Button>
		</DialogFooter>
	</ConsanguinityEventBusProvider>;
};