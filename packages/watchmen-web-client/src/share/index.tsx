import {Router} from '@/routes/types';
import {asFallbackRoute, asShareRoute} from '@/routes/utils';
import React, {lazy} from 'react';
import {Routes} from 'react-router-dom';
import {ShareNothing} from './share-nothing';

const Dashboard = lazy(() => import(/* webpackChunkName: "share-dashboard" */ './dashboard'));

export const ShareIndex = () => {
	return <Routes>
		{asShareRoute(Router.SHARE_DASHBOARD, <Dashboard/>)}
		{asFallbackRoute(<ShareNothing/>)}
	</Routes>;
};

export default ShareIndex;