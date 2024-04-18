import {isChainlitEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {Fragment, useEffect} from 'react';
import {matchPath, useLocation} from 'react-router-dom';

export const Chainlit = () => {
	const location = useLocation();

	useEffect(() => {
		document.documentElement.setAttribute('data-chainlit-enabled', 'false');
		document.documentElement.setAttribute('data-chainlit-visible', 'false');
		if (isChainlitEnabled()) {
			const script = document.createElement('script');
			script.src = process.env.REACT_APP_CHAINLIT_JS_URL!;
			script.defer = true;
			script.onload = () => {
				try {
					// @ts-ignore
					window.mountChainlitWidget({chainlitServer: process.env.REACT_APP_CHAINLIT_SERVER_URL});
					document.documentElement.setAttribute('data-chainlit-enabled', 'true');
				} catch (e) {
					console.error('Failed to mount chainLit widget.', e);
				}
			};
			script.onerror = (e) => {
				console.error('Failed to load chainlit script.', e);
			};
			document.head.appendChild(script);
		} else {
		}
	}, []);
	useEffect(() => {
		if (matchPath({path: Router.IDW_ALL}, location.pathname)) {
			document.documentElement.setAttribute('data-chainlit-visible', 'true');
		} else {
			document.documentElement.setAttribute('data-chainlit-visible', 'false');
		}
	}, [location.pathname]);
	return <Fragment/>;
};