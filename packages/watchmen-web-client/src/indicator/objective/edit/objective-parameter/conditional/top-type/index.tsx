import {ConditionalObjectiveParameter, ObjectiveParameterJointType} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useState} from 'react';
import {createFactorEqualsConstantParameter} from '../../../param-utils';
import {useConditionalEventBus} from '../conditional-event-bus';
import {ConditionalEventTypes} from '../conditional-event-bus-types';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {TopTypeButton, TopTypeContainer, TopTypeOption} from './top-type-widgets';

type TopTypeCandidate = 'anyway' | ObjectiveParameterJointType.AND | ObjectiveParameterJointType.OR;
const OptionsLabel = {
	[ObjectiveParameterJointType.AND]: 'And',
	[ObjectiveParameterJointType.OR]: 'Or',
	'anyway': 'Anyway'
};

const defendConditional = (conditional: ConditionalObjectiveParameter, conjunction?: ObjectiveParameterJointType) => {
	if (!conditional.conditional) {
		conditional.conditional = false;
		delete conditional.on;
	} else if (!conditional.on) {
		conditional.conditional = true;
		conditional.on = {
			conj: conjunction || ObjectiveParameterJointType.AND,
			filters: []
		};
	} else {
		conditional.conditional = true;
		conditional.on.conj = conjunction || conditional.on.conj || ObjectiveParameterJointType.AND;
		conditional.on.filters = conditional.on.filters || [];
	}
};

export const TopType = (props: { conditional: ConditionalObjectiveParameter }) => {
	const {conditional} = props;

	const {fire: fireConditional} = useConditionalEventBus();
	const {fire} = useJointEventBus();
	const [expanded, setExpanded] = useState(false);

	defendConditional(conditional);
	const conjunction = !conditional.conditional ? 'anyway' : conditional.on!.conj;

	const onExpandedClicked = () => setExpanded(true);
	const onBlur = () => setExpanded(false);
	const onTopTypeClicked = (newConj: TopTypeCandidate) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (newConj === conjunction) {
			if (!expanded) {
				setExpanded(true);
			}
		} else if (newConj === 'anyway') {
			conditional.conditional = false;
			delete conditional.on;
			setExpanded(false);
			fireConditional(ConditionalEventTypes.TOP_TYPE_CHANGED, conditional);
			fire(JointEventTypes.JOINT_TYPE_CHANGED, conditional.on);
		} else {
			conditional.conditional = true;
			defendConditional(conditional, newConj);
			if ((conditional.on!.filters.length || 0) === 0) {
				conditional.on!.filters.push(createFactorEqualsConstantParameter());
			}
			setExpanded(false);
			fireConditional(ConditionalEventTypes.TOP_TYPE_CHANGED, conditional);
			fire(JointEventTypes.JOINT_TYPE_CHANGED, conditional.on);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setExpanded(!expanded);
	};

	const candidates: Array<TopTypeCandidate> = [
		'anyway', ObjectiveParameterJointType.AND, ObjectiveParameterJointType.OR
	].filter(candidate => candidate !== conjunction) as Array<TopTypeCandidate>;

	return <TopTypeContainer tabIndex={0} onClick={onExpandedClicked} onBlur={onBlur}>
		<TopTypeOption active={true} expanded={expanded}
		               onClick={onTopTypeClicked(conjunction)}>
			{OptionsLabel[conjunction]}
		</TopTypeOption>
		{candidates.map(candidate => {
			return <TopTypeOption active={false} expanded={expanded}
			                      onClick={onTopTypeClicked(candidate)}
			                      key={candidate}>
				{OptionsLabel[candidate]}
			</TopTypeOption>;
		})}
		<TopTypeButton data-expanded={expanded} onClick={onIconClicked}>
			<FontAwesomeIcon icon={expanded ? ICON_COLLAPSE_CONTENT : ICON_EDIT}/>
		</TopTypeButton>
	</TopTypeContainer>;
};