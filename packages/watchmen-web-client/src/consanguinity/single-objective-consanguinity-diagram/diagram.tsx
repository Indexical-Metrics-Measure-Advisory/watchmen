import {Consanguinity} from '@/services/data/tuples/consanguinity';
import {fetchConsanguinity} from '@/services/data/tuples/objective';
import {Objective} from '@/services/data/tuples/objective-types';
import {Button} from '@/widgets/basic/button';
import {ICON_LOADING} from '@/widgets/basic/constants';
import {DialogFooter} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import {ConsanguinityActivation} from '../activation';
// noinspection ES6PreferShortImport
import {ConsanguinityEventBusProvider} from '../consanguinity-event-bus';
import {ConsanguinityLines} from '../lines';
import {IndicatorNode, ObjectiveFactorNode, ObjectiveTargetNode, SubjectNode, TopicNode} from '../nodes';
import {getIndicators, getObjectiveFactors, getObjectiveTargets, getSubjects, getTopics} from '../utils';
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
}

export const SingleObjectiveConsanguinityDiagram = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useEventBus();
	const [state, setState] = useState<State>({loaded: false});
	useEffect(() => {
		if (state.loaded) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => fetchConsanguinity(objective),
			(consanguinity: Consanguinity) => setState({loaded: true, data: consanguinity}));
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

	const consanguinity = state.data!;
	const {list: targets, map: targetMap} = getObjectiveTargets(consanguinity);

	if (targets.length === 0) {
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

	const {list: factors, map: factorMap} = getObjectiveFactors(consanguinity);
	const {list: indicators, map: indicatorMap} = getIndicators(consanguinity);
	const {list: subjects, map: subjectColumnMap} = getSubjects(consanguinity);
	const {list: topics, map: topicFactorMap} = getTopics(consanguinity);

	return <ConsanguinityEventBusProvider>
		<ConsanguinityDialogBody>
			<ObjectiveConsanguinityDiagram>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.OBJECTIVE_TARGET_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{targets.map(target => {
							return <ObjectiveTargetNode data={target} key={target['@cid']}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.OBJECTIVE_FACTOR_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{factors.map(factor => {
							return <ObjectiveFactorNode data={factor} key={factor['@cid']}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.INDICATOR_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{indicators.map(indicator => {
							return <IndicatorNode data={indicator} key={indicator['@cid']}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.SUBJECT_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{subjects.map(subject => {
							return <SubjectNode data={subject} key={subject.subjectId}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityBlockContainer>
					<ConsanguinityBlockLabel>{Lang.CONSANGUINITY.TOPIC_BLOCK_LABEL}</ConsanguinityBlockLabel>
					<ObjectiveConsanguinityBlockBody>
						{topics.map(topic => {
							return <TopicNode data={topic} key={topic.topicId}/>;
						})}
					</ObjectiveConsanguinityBlockBody>
				</ConsanguinityBlockContainer>
				<ConsanguinityLines consanguinity={consanguinity} maps={{
					objectiveTargetMap: targetMap, objectiveFactorMap: factorMap,
					indicatorMap, subjectColumnMap, topicFactorMap
				}}/>
				<ConsanguinityActivation consanguinity={consanguinity} maps={{
					objectiveTargetMap: targetMap, objectiveFactorMap: factorMap,
					indicatorMap, subjectColumnMap, topicFactorMap
				}}/>
			</ObjectiveConsanguinityDiagram>
		</ConsanguinityDialogBody>
		<DialogFooter>
			<Button onClick={onCloseClicked}>{Lang.ACTIONS.CLOSE}</Button>
		</DialogFooter>
	</ConsanguinityEventBusProvider>;
};