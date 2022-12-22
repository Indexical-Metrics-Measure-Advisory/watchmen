import {
	ConditionalObjectiveParameter,
	ObjectiveFactorOnIndicator,
	ObjectiveParameterJointType
} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useState} from 'react';
import {createFactorEqualsConstantParameter} from '../../../param-utils';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {useFilterEventBus} from '../filter-event-bus';
import {FilterEventTypes} from '../filter-event-bus-types';
import {
	TopTypeButton,
	TopTypeContainer,
	TopTypeOption,
	VeryTopTypeButton,
	VeryTopTypeContainer,
	VeryTopTypeOption
} from './top-type-widgets';

enum TopTypeFilterType {
	NO_FILTER = 'no-filter',
	AND = 'and',
	OR = 'or'
}

const defendFilter = (options: {
	factor: ObjectiveFactorOnIndicator;
	conditional?: ConditionalObjectiveParameter;
	filterType?: TopTypeFilterType
}) => {
	const {factor, conditional, filterType} = options;

	if (conditional == null) {
		const defendFilter = () => {
			if (factor.filter == null) {
				factor.filter = {conj: ObjectiveParameterJointType.AND, filters: []};
			} else {
				factor.filter.conj = factor.filter.conj || ObjectiveParameterJointType.AND;
				factor.filter.filters = factor.filter.filters || [];
			}
			if (factor.filter.filters.length === 0) {
				factor.filter.filters = [createFactorEqualsConstantParameter()];
			}
		};
		if (filterType === TopTypeFilterType.NO_FILTER) {
			factor.conditional = false;
		} else if (filterType === TopTypeFilterType.AND || filterType === TopTypeFilterType.OR) {
			factor.conditional = true;
			defendFilter();
			// factor.filter == null
		} else if (factor.conditional) {
			defendFilter();
		}
	} else {
		if (conditional.on == null) {
			conditional.on = {conj: ObjectiveParameterJointType.AND, filters: []};
		} else {
			conditional.on.conj = conditional.on.conj || ObjectiveParameterJointType.AND;
			conditional.on.filters = conditional.on.filters || [];
		}
		if (conditional.on.filters.length === 0) {
			conditional.on.filters = [createFactorEqualsConstantParameter()];
		}
	}
};

const getFilterType = (factor: ObjectiveFactorOnIndicator, conditional?: ConditionalObjectiveParameter): TopTypeFilterType => {
	if (conditional == null) {
		return !factor.conditional
			? TopTypeFilterType.NO_FILTER
			: (factor.filter?.conj === ObjectiveParameterJointType.OR ? TopTypeFilterType.OR : TopTypeFilterType.AND);
	} else {
		return conditional.on.conj === ObjectiveParameterJointType.OR ? TopTypeFilterType.OR : TopTypeFilterType.AND;
	}
};

export const TopType = (props: { factor: ObjectiveFactorOnIndicator; conditional?: ConditionalObjectiveParameter; }) => {
	const {factor, conditional} = props;

	const {fire: fireFilter} = useFilterEventBus();
	const {fire} = useJointEventBus();
	const [expanded, setExpanded] = useState(false);

	defendFilter({factor, conditional});
	const filterType = getFilterType(factor, conditional);

	const onExpandedClicked = () => setExpanded(true);
	const onBlur = () => setExpanded(false);
	const onTopTypeClicked = (newFilterType: TopTypeFilterType) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (newFilterType === filterType) {
			if (!expanded) {
				setExpanded(true);
			}
		} else {
			defendFilter({factor, conditional, filterType: newFilterType});
			if (conditional == null) {
				if (factor.conditional) {
					fire(JointEventTypes.JOINT_TYPE_CHANGED, factor.filter!);
				}
			} else {
				fire(JointEventTypes.JOINT_TYPE_CHANGED, conditional.on);
			}
			setExpanded(false);
			fireFilter(FilterEventTypes.TOP_TYPE_CHANGED, conditional ?? factor);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setExpanded(!expanded);
	};

	const candidates: Array<TopTypeFilterType> = Object.values(TopTypeFilterType)
		.filter(type => type !== filterType)
		.filter(type => conditional != null ? type !== TopTypeFilterType.NO_FILTER : true);
	const OptionsLabel = {
		[TopTypeFilterType.NO_FILTER]: Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_ON_NO_FILTER,
		[TopTypeFilterType.AND]: 'And',
		[TopTypeFilterType.OR]: 'Or'
	};

	const TypeContainer = conditional == null ? VeryTopTypeContainer : TopTypeContainer;
	const TypeOption = conditional == null ? VeryTopTypeOption : TopTypeOption;
	const TypeButton = conditional == null ? VeryTopTypeButton : TopTypeButton;

	return <TypeContainer tabIndex={0} onClick={onExpandedClicked} onBlur={onBlur}>
		<TypeOption active={true} expanded={expanded}
		            onClick={onTopTypeClicked(filterType)}>
			{OptionsLabel[filterType]}
		</TypeOption>
		{candidates.map(candidate => {
			return <TypeOption active={false} expanded={expanded}
			                   onClick={onTopTypeClicked(candidate)}
			                   key={candidate}>
				{OptionsLabel[candidate]}
			</TypeOption>;
		})}
		<TypeButton data-expanded={expanded} onClick={onIconClicked}>
			<FontAwesomeIcon icon={expanded ? ICON_COLLAPSE_CONTENT : ICON_EDIT}/>
		</TypeButton>
	</TypeContainer>;
};