import {isDataQualityCenterEnabled, isSaml2MockEnabled, isOidcMockEnabled} from '@/feature-switch';
import {findAccount, isAdmin, isSuperAdmin} from '@/services/data/account';
import {removeSSOTriggerURL, saveCurrentURL} from '@/services/data/login';
import {RemoteRequest} from '@/widgets/remote-request';
import React, {lazy, Suspense} from 'react';
import {BrowserRouter, Routes} from 'react-router-dom';
import {Router} from './types';
import {asFallbackNavigate, asTopRoute} from './utils';

const Login = lazy(() => import(/* webpackChunkName: "login" */ '../login'));
const Saml2Login = lazy(() => import(/* webpackChunkName: "login-saml2" */ '../login/saml2'));
const Saml2Callback = lazy(() => import(/* webpackChunkName: "login-saml2" */ '../login/saml2-callback'));
const OidcLogin = lazy(() => import(/* webpackChunkName: "login-oidc" */ '../login/oidc'));
const OidcCallback = lazy(() => import(/* webpackChunkName: "login-oidc" */ '../login/oidc-callback'));
const Admin = lazy(() => import(/* webpackChunkName: "admin" */ '../admin'));
const DataQuality = lazy(() => import(/* webpackChunkName: "data-quality" */ '../data-quality'));
const Indicator = lazy(() => import(/* webpackChunkName: "indicator" */ '../indicator'));
const Console = lazy(() => import(/* webpackChunkName: "console" */ '../console'));
const Share = lazy(() => import(/* webpackChunkName: "share" */ '../share'));

export const InternalRoutes = () => {
	const account = findAccount();
	if (account == null) {
		saveCurrentURL();
		// not login
		return <Routes>
			{asTopRoute(Router.LOGIN, <Login/>)}
			{isSaml2MockEnabled() ? asTopRoute(Router.MOCK_SAML2_LOGIN, <Saml2Login/>) : null}
			{asTopRoute(Router.SAML2_CALLBACK, <Saml2Callback/>)}
			{isOidcMockEnabled() ? asTopRoute(Router.MOCK_OIDC_LOGIN, <OidcLogin/>) : null}
			{asTopRoute(Router.OIDC_CALLBACK, <OidcCallback/>)}
			{asTopRoute(Router.SHARE_ALL, <Share/>)}
			{asFallbackNavigate(Router.LOGIN)}
		</Routes>;
	} else {
		removeSSOTriggerURL();
		return <Routes>
			{asTopRoute(Router.ADMIN_ALL, <Admin/>)}
			{isDataQualityCenterEnabled() ? asTopRoute(Router.DQC_ALL, <DataQuality/>) : null}
			{asTopRoute(Router.IDW_ALL, <Indicator/>)}
			{asTopRoute(Router.CONSOLE_ALL, <Console/>)}
			{asTopRoute(Router.LOGIN, <Login/>)}
			{isAdmin() || isSuperAdmin() ? asFallbackNavigate(Router.ADMIN) : asFallbackNavigate(Router.CONSOLE)}
		</Routes>;
	}
};

export const AppRoutes = () => {
	return <Suspense fallback={<div/>}>
		<BrowserRouter basename={process.env.REACT_APP_WEB_CONTEXT}>
			<RemoteRequest/>
			<InternalRoutes/>
		</BrowserRouter>
	</Suspense>;
};
