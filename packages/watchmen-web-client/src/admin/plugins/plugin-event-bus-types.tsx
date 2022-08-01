import {Plugin} from '@/services/data/tuples/plugin-types';

export enum PluginEventTypes {
	PLUGIN_CODE_CHANGED = 'plugin-code-changed',
	PLUGIN_NAME_CHANGED = 'plugin-name-changed',
	PLUGIN_TENANT_CHANGED = 'plugin-tenant-changed',
	PLUGIN_TYPE_CHANGED = 'plugin-type-changed',
	PLUGIN_APPLY_TO_CHANGED = 'plugin-apply-to-changed',
	PLUGIN_PARAM_CHANGED = 'plugin-param-changed'
}

export interface PluginEventBus {
	fire(type: PluginEventTypes.PLUGIN_CODE_CHANGED, plugin: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_CODE_CHANGED, listener: (plugin: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_CODE_CHANGED, listener: (plugin: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_NAME_CHANGED, plugin: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_NAME_CHANGED, listener: (plugin: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_NAME_CHANGED, listener: (plugin: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_TENANT_CHANGED, plugin: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_TENANT_CHANGED, listener: (plugin: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_TENANT_CHANGED, listener: (plugin: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_TYPE_CHANGED, plugin: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_TYPE_CHANGED, listener: (plugin: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_TYPE_CHANGED, listener: (plugin: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, plugin: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, listener: (plugin: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, listener: (plugin: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_PARAM_CHANGED, plugin: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_PARAM_CHANGED, listener: (plugin: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_PARAM_CHANGED, listener: (plugin: Plugin) => void): this;
}
