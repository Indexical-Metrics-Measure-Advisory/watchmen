import {ObjectiveFactorOnIndicator, ObjectiveParameterJointType} from '@/services/data/tuples/objective-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useState} from 'react';
import {createFactorEqualsConstantParameter} from '../../../param-utils';
import {useJointEventBus} from '../event-bus/joint-event-bus';
import {JointEventTypes} from '../event-bus/joint-event-bus-types';
import {useFilterEventBus} from '../filter-event-bus';
import {FilterEventTypes} from '../filter-event-bus-types';
import {VeryTopTypeButton, VeryTopTypeContainer, VeryTopTypeOption} from './top-type-widgets';

enum TopTypeFilterType {
	NO_FILTER = 'no-filter',
	AND = 'and',
	OR = 'or'
}

const defendFilter = (options: { factor: ObjectiveFactorOnIndicator; filterType?: TopTypeFilterType }) => {
	const {factor, filterType} = options;

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
};

const getFilterType = (factor: ObjectiveFactorOnIndicator): TopTypeFilterType => {
	return !factor.conditional
		? TopTypeFilterType.NO_FILTER
		: (factor.filter?.conj === ObjectiveParameterJointType.OR ? TopTypeFilterType.OR : TopTypeFilterType.AND);
};

export const FactorTopType = (props: { factor: ObjectiveFactorOnIndicator; }) => {
	const {factor} = props;

	const {fire: fireFilter} = useFilterEventBus();
	const {fire} = useJointEventBus();
	const [expanded, setExpanded] = useState(false);

	defendFilter({factor});
	const filterType = getFilterType(factor);

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
			defendFilter({factor, filterType: newFilterType});
			if (factor.conditional) {
				fire(JointEventTypes.JOINT_TYPE_CHANGED, factor.filter!);
			}
			setExpanded(false);
			fireFilter(FilterEventTypes.TOP_TYPE_CHANGED, factor);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setExpanded(!expanded);
	};

	const candidates: Array<TopTypeFilterType> = Object.values(TopTypeFilterType).filter(type => type !== filterType);
	const OptionsLabel = {
		[TopTypeFilterType.NO_FILTER]: Lang.INDICATOR.OBJECTIVE.REFER_INDICATOR_ON_NO_FILTER,
		[TopTypeFilterType.AND]: 'And',
		[TopTypeFilterType.OR]: 'Or'
	};

	return <VeryTopTypeContainer tabIndex={0} onClick={onExpandedClicked} onBlur={onBlur}>
		<VeryTopTypeOption active={true} expanded={expanded}
		                   onClick={onTopTypeClicked(filterType)}>
			{OptionsLabel[filterType]}
		</VeryTopTypeOption>
		{candidates.map(candidate => {
			return <VeryTopTypeOption active={false} expanded={expanded}
			                          onClick={onTopTypeClicked(candidate)}
			                          key={candidate}>
				{OptionsLabel[candidate]}
			</VeryTopTypeOption>;
		})}
		<VeryTopTypeButton data-expanded={expanded} onClick={onIconClicked}>
			<FontAwesomeIcon icon={expanded ? ICON_COLLAPSE_CONTENT : ICON_EDIT}/>
		</VeryTopTypeButton>
	</VeryTopTypeContainer>;
};
