import {isWriteExternalEnabled} from '@/feature-switch';
import {
	fetchMockPlugin,
	listMockAchievementPlugins,
	listMockPlugins,
	saveMockPlugin
} from '../../data/mock/tuples/mock-plugin';
import {Apis, get, page, post} from '../apis';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {Plugin, PluginId} from './plugin-types';
import {QueryPlugin} from './query-plugin-types';
import {isFakedUuid} from './utils';

export const listPlugins = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryPlugin>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockPlugins(options);
	} else {
		return await page({api: Apis.PLUGIN_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
	}
};

export const fetchPlugin = async (pluginId: PluginId): Promise<{ plugin: Plugin }> => {
	if (isMockService()) {
		const {plugin} = await fetchMockPlugin(pluginId);
		return {plugin};
	} else {
		const plugin = await get({api: Apis.PLUGIN_GET, search: {pluginId}});
		return {plugin};
	}
};

export const savePlugin = async (plugin: Plugin): Promise<void> => {
	if (isMockService()) {
		await saveMockPlugin(plugin);
	} else if (isFakedUuid(plugin)) {
		const data = await post({api: Apis.PLUGIN_CREATE, data: plugin});
		plugin.pluginId = data.pluginId;
		plugin.version = data.version;
		plugin.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({api: Apis.PLUGIN_SAVE, data: plugin});
		plugin.version = data.version;
		plugin.lastModifiedAt = data.lastModifiedAt;
	}
};

export const listAchievementPlugins = async (): Promise<Array<QueryPlugin>> => {
	if (!isWriteExternalEnabled()) {
		return [];
	} else if (isMockService()) {
		return listMockAchievementPlugins();
	} else {
		// return listMockEnumsForHolder();
		return await get({api: Apis.PLUGIN_LOAD_ALL_ACHIEVEMENT});
	}
};
