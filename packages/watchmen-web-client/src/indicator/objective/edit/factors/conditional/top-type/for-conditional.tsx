import {ConditionalObjectiveParameter, ObjectiveParameterJointType} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useState} from 'react';
import {createFactorEqualsConstantParameter} from '../../../param-utils';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {useFilterEventBus} from '../filter-event-bus';
import {FilterEventTypes} from '../filter-event-bus-types';
import {TopTypeButton, TopTypeContainer, TopTypeOption} from './top-type-widgets';

enum TopTypeFilterType {
	AND = 'and',
	OR = 'or',
	ANYWAY = 'anyway'
}

const defendFilter = (options: { conditional: ConditionalObjectiveParameter; filterType?: TopTypeFilterType }) => {
	const {conditional, filterType} = options;

	const defendNoCondition = () => {
		conditional.conditional = false;
		delete conditional.on;
	};
	const defendCondition = () => {
		conditional.conditional = true;
		if (conditional.on == null) {
			conditional.on = {conj: ObjectiveParameterJointType.AND, filters: []};
		} else {
			conditional.on.conj = conditional.on.conj || ObjectiveParameterJointType.AND;
			conditional.on.filters = conditional.on.filters || [];
		}
		if (conditional.on.filters.length === 0) {
			conditional.on.filters = [createFactorEqualsConstantParameter()];
		}
	};

	if (filterType === TopTypeFilterType.ANYWAY) {
		defendNoCondition();
	} else if (filterType === TopTypeFilterType.AND) {
		defendCondition();
		conditional.on!.conj = ObjectiveParameterJointType.AND;
	} else if (filterType === TopTypeFilterType.OR) {
		defendCondition();
		conditional.on!.conj = ObjectiveParameterJointType.OR;
	} else if (!conditional.conditional) {
		defendNoCondition();
	} else {
		defendCondition();
	}
};

const getFilterType = (conditional: ConditionalObjectiveParameter): TopTypeFilterType => {
	if (!conditional.conditional) {
		return TopTypeFilterType.ANYWAY;
	} else {
		return conditional.on?.conj === ObjectiveParameterJointType.OR ? TopTypeFilterType.OR : TopTypeFilterType.AND;
	}
};

export const ConditionalTopType = (props: { conditional: ConditionalObjectiveParameter; }) => {
	const {conditional} = props;

	const {fire: fireFilter} = useFilterEventBus();
	const {fire} = useJointEventBus();
	const [expanded, setExpanded] = useState(false);

	defendFilter({conditional});
	const filterType = getFilterType(conditional);

	const onExpandedClicked = () => setExpanded(true);
	const onBlur = () => setExpanded(false);
	const onTopTypeClicked = (newFilterType: TopTypeFilterType) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (newFilterType === filterType) {
			if (!expanded) {
				setExpanded(true);
			}
		} else if (newFilterType === TopTypeFilterType.ANYWAY) {
			conditional.conditional = false;
			delete conditional.on;
			setExpanded(false);
			fire(JointEventTypes.JOINT_TYPE_CHANGED, conditional.on);
			fireFilter(FilterEventTypes.TOP_TYPE_CHANGED, conditional);
		} else {
			defendFilter({conditional, filterType: newFilterType});
			fire(JointEventTypes.JOINT_TYPE_CHANGED, conditional.on);
			setExpanded(false);
			fireFilter(FilterEventTypes.TOP_TYPE_CHANGED, conditional);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setExpanded(!expanded);
	};

	const candidates: Array<TopTypeFilterType> = Object.values(TopTypeFilterType)
		.filter(type => type !== filterType);
	const OptionsLabel = {
		[TopTypeFilterType.ANYWAY]: 'Anyway',
		[TopTypeFilterType.AND]: 'And',
		[TopTypeFilterType.OR]: 'Or'
	};

	return <TopTypeContainer tabIndex={0} onClick={onExpandedClicked} onBlur={onBlur}>
		<TopTypeOption active={true} expanded={expanded}
		               onClick={onTopTypeClicked(filterType)}>
			{OptionsLabel[filterType]}
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