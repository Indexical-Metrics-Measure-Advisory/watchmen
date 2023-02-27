import {toDerivedObjective} from '@/routes/utils';
import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ICON_DERIVED_OBJECTIVE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useNavigate} from 'react-router-dom';
import {CardContainer, CardLastVisit, CardName} from './widgets';

export const DerivedObjectiveCard = (props: {
	derivedObjective: DerivedObjective;
}) => {
	const {derivedObjective} = props;

	const navigate = useNavigate();

	const onDerivedObjectiveClicked = () => {
		navigate(toDerivedObjective(derivedObjective.derivedObjectiveId));
	};

	return <CardContainer onClick={onDerivedObjectiveClicked}>
		<FontAwesomeIcon icon={ICON_DERIVED_OBJECTIVE}/>
		<CardLastVisit>{derivedObjective.lastVisitTime}</CardLastVisit>
		<CardName>{derivedObjective.name}</CardName>
	</CardContainer>;
};