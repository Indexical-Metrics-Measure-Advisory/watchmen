import {toConnectedSpace} from '@/routes/utils';
import {ConnectedSpace} from '@/services/data/tuples/connected-space-types';
import {ICON_CONNECTED_SPACE} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useNavigate} from 'react-router-dom';
import {CardContainer, CardLastVisit, CardName} from './widgets';

export const ConnectedSpaceCard = (props: {
	connectedSpace: ConnectedSpace;
}) => {
	const {connectedSpace} = props;

	const navigate = useNavigate();

	const onConnectedSpaceClicked = () => {
		navigate(toConnectedSpace(connectedSpace.connectId));
	};

	return <CardContainer onClick={onConnectedSpaceClicked}>
		<FontAwesomeIcon icon={ICON_CONNECTED_SPACE}/>
		<CardLastVisit>{connectedSpace.lastVisitTime}</CardLastVisit>
		<CardName>{connectedSpace.name}</CardName>
	</CardContainer>;
};