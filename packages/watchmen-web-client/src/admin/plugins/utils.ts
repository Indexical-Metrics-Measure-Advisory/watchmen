import {Plugin, PluginApplyTo, PluginType} from '@/services/data/tuples/plugin-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';

export const createPlugin = (): Plugin => {
	return {
		pluginId: generateUuid(),
		pluginCode: '',
		name: '',
		type: PluginType.STREAMLIT,
		applyTo: PluginApplyTo.ACHIEVEMENT,
		version: 1,
		createdAt: getCurrentTime(),
		lastModifiedAt: getCurrentTime()
	};
};
