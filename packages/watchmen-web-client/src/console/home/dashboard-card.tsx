import {toDashboard} from '@/routes/utils';
import {Dashboard} from '@/services/data/tuples/dashboard-types';
import {ICON_DASHBOARD} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useNavigate} from 'react-router-dom';
import {CardContainer, CardLastVisit, CardName} from './widgets';

export const DashboardCard = (props: {
	dashboard: Dashboard;
}) => {
	const {dashboard} = props;

	const navigate = useNavigate();

	const onDashboardClicked = () => {
		navigate(toDashboard(dashboard.dashboardId));
	};

	return <CardContainer onClick={onDashboardClicked}>
		<FontAwesomeIcon icon={ICON_DASHBOARD}/>
		<CardLastVisit>{dashboard.lastVisitTime}</CardLastVisit>
		<CardName>{dashboard.name}</CardName>
	</CardContainer>;
};