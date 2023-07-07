import {listConvergencesForHolder} from '@/services/data/tuples/convergence';
import {ConvergenceId} from '@/services/data/tuples/convergence-types';
import {QueryConvergenceForHolder} from '@/services/data/tuples/query-convergence-types';
import {UserGroup} from '@/services/data/tuples/user-group-types';
import {TupleItemPicker} from '@/widgets/tuple-workbench/tuple-item-picker';
import React from 'react';

const hasConvergence = (userGroup: UserGroup) => !!userGroup.convergenceIds && userGroup.convergenceIds.length > 0;
const getConvergenceIds = (userGroup: UserGroup): Array<ConvergenceId> => userGroup.convergenceIds;
const findNameFromConvergences = (convergenceId: ConvergenceId, convergences: Array<QueryConvergenceForHolder>): string => {
	// eslint-disable-next-line
	return (convergences.find(convergence => convergence.convergenceId == convergenceId)?.name ?? 'Unknown Convergence') || 'Noname Convergence';
};
const removeConvergence = (userGroup: UserGroup) => (convergenceOrId: ConvergenceId | QueryConvergenceForHolder) => {
	let convergenceId: ConvergenceId;
	if (typeof convergenceOrId === 'string') {
		convergenceId = convergenceOrId;
	} else {
		convergenceId = convergenceOrId.convergenceId;
	}
	// eslint-disable-next-line
	const index = userGroup.convergenceIds.findIndex(id => id == convergenceId);
	if (index !== -1) {
		userGroup.convergenceIds.splice(index, 1);
	}
};
const addConvergence = (userGroup: UserGroup) => (convergence: QueryConvergenceForHolder) => {
	const {convergenceId} = convergence;
	// eslint-disable-next-line
	const index = userGroup.convergenceIds.findIndex(id => id == convergenceId);
	if (index === -1) {
		userGroup.convergenceIds.push(convergenceId);
	}
};
const getIdOfConvergence = (convergence: QueryConvergenceForHolder) => convergence.convergenceId;
const getNameOfConvergence = (convergence: QueryConvergenceForHolder) => convergence.name;
// eslint-disable-next-line
const isConvergencePicked = (userGroup: UserGroup) => (convergence: QueryConvergenceForHolder) => userGroup.convergenceIds.some(convergenceId => convergenceId == convergence.convergenceId);

export const ConvergencePicker = (props: {
	label: string;
	userGroup: UserGroup;
	codes: Array<QueryConvergenceForHolder>;
}) => {
	const {label, userGroup, codes} = props;

	return <TupleItemPicker actionLabel={label}
	                        holder={userGroup} codes={codes}
	                        isHolding={hasConvergence} getHoldIds={getConvergenceIds} getNameOfHold={findNameFromConvergences}
	                        listCandidates={listConvergencesForHolder} getIdOfCandidate={getIdOfConvergence}
	                        getNameOfCandidate={getNameOfConvergence} isCandidateHold={isConvergencePicked(userGroup)}
	                        removeHold={removeConvergence(userGroup)} addHold={addConvergence(userGroup)}/>;
};
