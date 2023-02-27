import {listObjectivesForHolder} from '@/services/data/tuples/objective';
import {ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryObjectiveForHolder} from '@/services/data/tuples/query-objective-types';
import {UserGroup} from '@/services/data/tuples/user-group-types';
import {TupleItemPicker} from '@/widgets/tuple-workbench/tuple-item-picker';
import React from 'react';

const hasObjective = (userGroup: UserGroup) => !!userGroup.objectiveIds && userGroup.objectiveIds.length > 0;
const getObjectiveIds = (userGroup: UserGroup): Array<ObjectiveId> => userGroup.objectiveIds;
const findNameFromObjectives = (objectiveId: ObjectiveId, objectives: Array<QueryObjectiveForHolder>): string => {
	// eslint-disable-next-line
	return objectives.find(objective => objective.objectiveId == objectiveId)!.name;
};
const removeObjective = (userGroup: UserGroup) => (objectiveOrId: ObjectiveId | QueryObjectiveForHolder) => {
	let objectiveId: ObjectiveId;
	if (typeof objectiveOrId === 'string') {
		objectiveId = objectiveOrId;
	} else {
		objectiveId = objectiveOrId.objectiveId;
	}
	// eslint-disable-next-line
	const index = userGroup.objectiveIds.findIndex(id => id == objectiveId);
	if (index !== -1) {
		userGroup.objectiveIds.splice(index, 1);
	}
};
const addObjective = (userGroup: UserGroup) => (objective: QueryObjectiveForHolder) => {
	const {objectiveId} = objective;
	// eslint-disable-next-line
	const index = userGroup.objectiveIds.findIndex(id => id == objectiveId);
	if (index === -1) {
		userGroup.objectiveIds.push(objectiveId);
	}
};
const getIdOfObjective = (objective: QueryObjectiveForHolder) => objective.objectiveId;
const getNameOfObjective = (objective: QueryObjectiveForHolder) => objective.name;
// eslint-disable-next-line
const isObjectivePicked = (userGroup: UserGroup) => (objective: QueryObjectiveForHolder) => userGroup.objectiveIds.some(objectiveId => objectiveId == objective.objectiveId);

export const ObjectivePicker = (props: {
	label: string;
	userGroup: UserGroup;
	codes: Array<QueryObjectiveForHolder>;
}) => {
	const {label, userGroup, codes} = props;

	return <TupleItemPicker actionLabel={label}
	                        holder={userGroup} codes={codes}
	                        isHolding={hasObjective} getHoldIds={getObjectiveIds} getNameOfHold={findNameFromObjectives}
	                        listCandidates={listObjectivesForHolder} getIdOfCandidate={getIdOfObjective}
	                        getNameOfCandidate={getNameOfObjective} isCandidateHold={isObjectivePicked(userGroup)}
	                        removeHold={removeObjective(userGroup)} addHold={addObjective(userGroup)}/>;
};
