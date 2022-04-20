import {fetchIndicatorsForSelection} from '@/services/data/tuples/indicator';
import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {QueryIndicatorForHolder} from '@/services/data/tuples/query-indicator-types';
import {UserGroup} from '@/services/data/tuples/user-group-types';
import {TupleItemPicker} from '@/widgets/tuple-workbench/tuple-item-picker';
import React from 'react';

const hasIndicator = (userGroup: UserGroup) => !!userGroup.indicatorIds && userGroup.indicatorIds.length > 0;
const getIndicatorIds = (userGroup: UserGroup): Array<IndicatorId> => userGroup.indicatorIds;
const findNameFromIndicators = (indicatorId: IndicatorId, indicators: Array<QueryIndicatorForHolder>): string => {
	// eslint-disable-next-line
	return indicators.find(indicator => indicator.indicatorId == indicatorId)!.name;
};
const removeIndicator = (userGroup: UserGroup) => (indicatorOrId: string | QueryIndicatorForHolder) => {
	let indicatorId: IndicatorId;
	if (typeof indicatorOrId === 'string') {
		indicatorId = indicatorOrId;
	} else {
		indicatorId = indicatorOrId.indicatorId;
	}
	// eslint-disable-next-line
	const index = userGroup.indicatorIds.findIndex(id => id == indicatorId);
	if (index !== -1) {
		userGroup.indicatorIds.splice(index, 1);
	}
};
const addIndicator = (userGroup: UserGroup) => (indicator: QueryIndicatorForHolder) => {
	const {indicatorId} = indicator;
	// eslint-disable-next-line
	const index = userGroup.indicatorIds.findIndex(id => id == indicatorId);
	if (index === -1) {
		userGroup.indicatorIds.push(indicatorId);
	}
};
const getIdOfIndicator = (indicator: QueryIndicatorForHolder) => indicator.indicatorId;
const getNameOfIndicator = (indicator: QueryIndicatorForHolder) => indicator.name;
// eslint-disable-next-line
const isIndicatorPicked = (userGroup: UserGroup) => (indicator: QueryIndicatorForHolder) => userGroup.indicatorIds.some(indicatorId => indicatorId == indicator.indicatorId);

export const IndicatorPicker = (props: {
	label: string;
	userGroup: UserGroup;
	codes: Array<QueryIndicatorForHolder>;
}) => {
	const {label, userGroup, codes} = props;

	return <TupleItemPicker actionLabel={label}
	                        holder={userGroup} codes={codes}
	                        isHolding={hasIndicator} getHoldIds={getIndicatorIds} getNameOfHold={findNameFromIndicators}
	                        listCandidates={fetchIndicatorsForSelection} getIdOfCandidate={getIdOfIndicator}
	                        getNameOfCandidate={getNameOfIndicator} isCandidateHold={isIndicatorPicked(userGroup)}
	                        removeHold={removeIndicator(userGroup)} addHold={addIndicator(userGroup)}/>;
};
