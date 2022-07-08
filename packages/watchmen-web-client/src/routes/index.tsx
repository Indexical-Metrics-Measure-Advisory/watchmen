import {isDataQualityCenterEnabled, isSaml2MockEnabled} from '@/feature-switch';
import {findAccount, isAdmin, isSuperAdmin} from '@/services/data/account';
import {removeSSOTriggerURL, saveCurrentURL} from '@/services/data/login';
import {RemoteRequest} from '@/widgets/remote-request';
import React, {lazy, Suspense} from 'react';
import {BrowserRouter, Redirect, Route, Switch} from 'react-router-dom';
import {Router} from './types';

const Login = lazy(() => import(/* webpackChunkName: "login" */ '../login'));
const Saml2Login = lazy(() => import(/* webpackChunkName: "login-saml2" */ '../login/saml2'));
const Saml2Callback = lazy(() => import(/* webpackChunkName: "login-saml2" */ '../login/saml2-callback'));
const Admin = lazy(() => import(/* webpackChunkName: "admin" */ '../admin'));
const DataQuality = lazy(() => import(/* webpackChunkName: "data-quality" */ '../data-quality'));
const Indicator = lazy(() => import(/* webpackChunkName: "indicator" */ '../indicator'));
const Console = lazy(() => import(/* webpackChunkName: "console" */ '../console'));
const Share = lazy(() => import(/* webpackChunkName: "console" */ '../share'));

export const InternalRoutes = () => {
	const account = findAccount();
	if (account == null) {
		saveCurrentURL();
		// not login
		return <Switch>
			<Route path={Router.LOGIN}><Login/></Route>
			{isSaml2MockEnabled() ?
				<Route path={Router.MOCK_SAML2_LOGIN}><Saml2Login/></Route> : null}
			<Route path={Router.SAML2_CALLBACK}><Saml2Callback/></Route>
			<Route path="*">
				<Redirect to={Router.LOGIN}/>
			</Route>
		</Switch>;
	} else {
		removeSSOTriggerURL();
		return <Switch>
			<Route path={Router.ADMIN}><Admin/></Route>
			{isDataQualityCenterEnabled()
				? <Route path={Router.DATA_QUALITY}><DataQuality/></Route>
				: null
			}
			<Route path={Router.INDICATOR}><Indicator/></Route>
			<Route path={Router.CONSOLE}><Console/></Route>
			<Route path={Router.SHARE}><Share/></Route>
			<Route path={Router.LOGIN}><Login/></Route>
			<Route path="*">
				{isAdmin() || isSuperAdmin() ? <Redirect to={Router.ADMIN}/> : <Redirect to={Router.CONSOLE}/>}
			</Route>
		</Switch>;
	}
};

export const Routes = () => {
	return <Suspense fallback={<div/>}>
		<BrowserRouter basename={process.env.REACT_APP_WEB_CONTEXT}>
			<RemoteRequest/>
			<InternalRoutes/>
		</BrowserRouter>
	</Suspense>;
};