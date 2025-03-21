import {Router} from '@/routes/types';
import {asConsoleRoute, asFallbackNavigate} from '@/routes/utils';
import {findAccount, isSuperAdmin} from '@/services/data/account';
import {LastSnapshot} from '@/services/data/account/last-snapshot-types';
import React, {useEffect, useState} from 'react';
import {Navigate, Routes} from 'react-router-dom';
import styled from 'styled-components';
import ConsoleConnectedSpace from './connected-space';
import {ConsoleEventBusProvider, useConsoleEventBus} from './console-event-bus';
import {ConsoleEventTypes} from './console-event-bus-types';
import {ConsoleLoading} from './console-loading';
import ConsoleDashboard from './dashboard';
import ConsoleDerivedObjective from './derived-objective';
import {Favorite} from './favorite';
import ConsoleHome from './home';
import {ConsoleMenu} from './menu';
import ConsoleSettings from './settings';
import {SettingsHolder} from './settings-holder';

const ConsoleContainer = styled.div.attrs({'data-widget': 'console'})`
	display    : flex;
	height     : 100vh;
	max-height : 100vh;
	@media print {
		height     : unset;
		max-height : unset;
	}
`;
const ConsoleMain = styled.main.attrs({'data-widget': 'console-main'})`
	flex-grow      : 1;
	display        : flex;
	flex-direction : column;
	height         : 100vh;
	min-height     : 100vh;
	@media print {
		height : unset;
	}
`;
const ConsolePinFavoritePlaceholder = styled.div.attrs<{ favorite: boolean }>(({favorite}) => {
	return {
		'data-widget': 'console-report-workbench-pin-favorite-placeholder',
		style: {
			height: favorite ? 'var(--pin-favorite-height)' : 0,
			minHeight: favorite ? 'var(--pin-favorite-height)' : 0
		}
	};
})<{ favorite: boolean }>`
	transition : min-height 300ms ease-in-out, height 300ms ease-in-out;
`;
const ConsoleWorkbench = styled.div.attrs({
	'data-widget': 'console-workbench',
	'data-v-scroll': ''
})`
	flex-grow  : 1;
	display    : flex;
	overflow-y : auto;
	@media print {
		overflow-y : unset;
	}
`;

const ConsoleFavoritePlaceholder = () => {
	const {fire, on, off} = useConsoleEventBus();
	const [favorite, setFavorite] = useState(false);
	useEffect(() => {
		const onFavoritePin = () => setFavorite(true);
		const onFavoriteUnpin = () => setFavorite(false);

		on(ConsoleEventTypes.PIN_FAVORITE, onFavoritePin);
		on(ConsoleEventTypes.UNPIN_FAVORITE, onFavoriteUnpin);
		return () => {
			off(ConsoleEventTypes.PIN_FAVORITE, onFavoritePin);
			off(ConsoleEventTypes.UNPIN_FAVORITE, onFavoriteUnpin);
		};
	}, [on, off]);
	useEffect(() => {
		fire(ConsoleEventTypes.ASK_LAST_SNAPSHOT, ({favoritePin}: LastSnapshot) => {
			if (favoritePin) {
				setFavorite(true);
			}
		});
	}, [fire]);

	return <ConsolePinFavoritePlaceholder favorite={favorite}/>;
};

const ConsoleRouter = () => {
	return <>
		<ConsoleMenu/>
		<ConsoleMain>
			<ConsoleFavoritePlaceholder/>
			<ConsoleWorkbench>
				<Routes>
					{asConsoleRoute(Router.CONSOLE_HOME, <ConsoleHome/>)}
					{asConsoleRoute(Router.CONSOLE_CONNECTED_SPACE_ALL, <ConsoleConnectedSpace/>)}
					{asConsoleRoute(Router.CONSOLE_DERIVED_OBJECTIVE_ALL, <ConsoleDerivedObjective/>)}
					{asConsoleRoute(Router.CONSOLE_DASHBOARD_ALL, <ConsoleDashboard/>)}
					{asConsoleRoute(Router.CONSOLE_SETTINGS, <ConsoleSettings/>)}
					{asFallbackNavigate(Router.CONSOLE_HOME)}
				</Routes>
			</ConsoleWorkbench>
		</ConsoleMain>
		<Favorite/>
	</>;
};
const ConsoleContainerDelegate = () => {
	const {on, off} = useConsoleEventBus();
	const [initialized, setInitialized] = useState(false);
	useEffect(() => {
		const startTime = new Date().getTime();
		const onSettingsLoaded = () => {
			const endTime = new Date().getTime();
			if (endTime - startTime < 3000) {
				setTimeout(() => setInitialized(true), (3000 - (endTime - startTime)));
			} else {
				setInitialized(true);
			}
		};
		on(ConsoleEventTypes.SETTINGS_LOADED, onSettingsLoaded);
		return () => {
			off(ConsoleEventTypes.SETTINGS_LOADED, onSettingsLoaded);
		};
	}, [on, off]);

	return <ConsoleContainer>
		<SettingsHolder/>
		{initialized ? <ConsoleRouter/> : <ConsoleLoading/>}
	</ConsoleContainer>;
};
const ConsoleIndex = () => {
	if (!findAccount()) {
		return <Navigate to={Router.LOGIN}/>;
	}

	if (isSuperAdmin()) {
		return <Navigate to={Router.ADMIN}/>;
	}

	return <ConsoleEventBusProvider>
		<ConsoleContainerDelegate/>
	</ConsoleEventBusProvider>;
};

export default ConsoleIndex;