import {isPluginEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {isSuperAdmin} from '@/services/data/account';
import {TuplePage} from '@/services/data/query/tuple-page';
import {fetchPlugin, listPlugins, savePlugin} from '@/services/data/tuples/plugin';
import {Plugin} from '@/services/data/tuples/plugin-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {listTenants} from '@/services/data/tuples/tenant';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {useHistory} from 'react-router-dom';
import PluginBackground from '../../assets/plugin-background.svg';
import {useAdminCacheEventBus} from '../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../cache/cache-event-bus-types';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {createPlugin} from './utils';

const fetchPluginAndCodes = async (queryPlugin: QueryPlugin) => {
	const {plugin} = await fetchPlugin(queryPlugin.pluginId);
	const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
	return {tuple: plugin, tenants};
};

const getKeyOfPlugin = (plugin: QueryPlugin) => plugin.pluginId;

const AdminPlugins = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireCache} = useAdminCacheEventBus();
	const {on, off, fire} = useTupleEventBus();
	useEffect(() => {
		const onDoCreatePlugin = () => {
			const dataSource = createPlugin();
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
					return {tenants};
				},
				({tenants}) => fire(TupleEventTypes.TUPLE_CREATED, dataSource, {tenants}));
		};
		const onDoEditPlugin = async (queryPlugin: QueryPlugin) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchPluginAndCodes(queryPlugin),
				({tuple, tenants}) => fire(TupleEventTypes.TUPLE_LOADED, tuple, {tenants}));
		};
		const onDoSearchPlugin = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listPlugins({
					search: searchText,
					pageNumber,
					pageSize: TUPLE_SEARCH_PAGE_SIZE
				}),
				(page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
		};
		const onSavePlugin = async (plugin: Plugin, onSaved: (plugin: Plugin, saved: boolean) => void) => {
			if (!plugin.pluginCode || !plugin.pluginCode.trim()) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Plugin code is required.</AlertLabel>, () => {
					onSaved(plugin, false);
				});
				return;
			}
			if (!plugin.type) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Plugin type is required.</AlertLabel>, () => {
					onSaved(plugin, false);
				});
				return;
			}
			if (!plugin.tenantId) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Data zone is required.</AlertLabel>, () => {
					onSaved(plugin, false);
				});
				return;
			}
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await savePlugin(plugin),
				() => {
					onSaved(plugin, true);
					fireCache(AdminCacheEventTypes.SAVE_PLUGIN, plugin);
				},
				() => onSaved(plugin, false));
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreatePlugin);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditPlugin);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchPlugin);
		on(TupleEventTypes.SAVE_TUPLE, onSavePlugin);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreatePlugin);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditPlugin);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchPlugin);
			off(TupleEventTypes.SAVE_TUPLE, onSavePlugin);
		};
	}, [on, off, fire, fireCache, fireGlobal]);
	useHelp(HELP_KEYS.ADMIN_PLUGIN);

	return <TupleWorkbench title="Plugins"
	                       createButtonLabel="Create Plugin" canCreate={true}
	                       searchPlaceholder="Search by plugin name, etc."
	                       tupleLabel="Plugin" tupleImage={PluginBackground}
	                       tupleImagePosition="left 80px"
	                       renderEditor={renderEditor}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfPlugin}
	/>;
};

const AdminPluginsIndex = () => {
	const history = useHistory();
	if (!isPluginEnabled()) {
		if (isSuperAdmin()) {
			history.replace(Router.ADMIN_TENANTS);
		} else {
			history.replace(Router.ADMIN_HOME);
		}
		return null;
	}

	return <TupleEventBusProvider>
		<AdminPlugins/>
	</TupleEventBusProvider>;
};

export default AdminPluginsIndex;