import {TuplePage} from '../../query/tuple-page';
import {Plugin, PluginApplyTo, PluginType} from '../../tuples/plugin-types';
import {QueryPlugin, QueryPluginForHolder} from '../../tuples/query-plugin-types';
import {isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';

const StreamlitAchievementPlugin001: Plugin = {
	pluginId: '1',
	pluginCode: 'STREAMLIT-001',
	name: 'Streamlit Visualization 001',
	type: PluginType.STREAMLIT,
	applyTo: PluginApplyTo.ACHIEVEMENT,
	tenantId: '1',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};
const StreamlitAchievementPlugin002: Plugin = {
	pluginId: '2',
	pluginCode: 'STREAMLIT-002',
	name: 'Streamlit Visualization 002',
	type: PluginType.STREAMLIT,
	applyTo: PluginApplyTo.ACHIEVEMENT,
	tenantId: '1',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

const ALL_PLUGINS = [StreamlitAchievementPlugin001, StreamlitAchievementPlugin002];

export const listMockPlugins = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryPlugin>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				data: ALL_PLUGINS.map(writer => {
					return {tenantName: 'X World', ...writer};
				}),
				itemCount: 2,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};

export const fetchMockPlugin = async (pluginId: string): Promise<{ plugin: Plugin }> => {
	return {
		// eslint-disable-next-line
		plugin: ALL_PLUGINS.find(writer => writer.pluginId == pluginId) ?? StreamlitAchievementPlugin001
	};
};

let newPluginId = 10000;
export const saveMockPlugin = async (plugin: Plugin): Promise<void> => {
	return new Promise((resolve) => {
		if (isFakedUuid(plugin)) {
			plugin.pluginId = `${newPluginId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const listMockPluginsForHolder = async (): Promise<Array<QueryPluginForHolder>> => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(ALL_PLUGINS);
		}, 500);
	});
};

export const DemoPlugins: Array<Plugin> = ALL_PLUGINS;
