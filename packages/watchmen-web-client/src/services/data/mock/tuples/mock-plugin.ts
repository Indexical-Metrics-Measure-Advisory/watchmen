import {TuplePage} from '../../query/tuple-page';
import {Plugin, PluginApplyTo, PluginType} from '../../tuples/plugin-types';
import {QueryPlugin, QueryPluginForHolder} from '../../tuples/query-plugin-types';
import {isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';

const StreamlitAchievementPlugin: Plugin = {
	pluginId: '1',
	pluginCode: 'STREAMLIT-ACHIEVEMENT',
	name: 'Streamlit Visualization',
	type: PluginType.STREAMLIT,
	applyTo: PluginApplyTo.ACHIEVEMENT,
	tenantId: '1',
	version: 1,
	createdAt: getCurrentTime(),
	lastModifiedAt: getCurrentTime()
};

export const listMockPlugins = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryPlugin>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve({
				data: [StreamlitAchievementPlugin].map(writer => {
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
		plugin: [StreamlitAchievementPlugin].find(writer => writer.pluginId == pluginId) ?? StreamlitAchievementPlugin
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
			resolve([StreamlitAchievementPlugin]);
		}, 500);
	});
};

export const DemoPlugins: Array<Plugin> = [StreamlitAchievementPlugin];
