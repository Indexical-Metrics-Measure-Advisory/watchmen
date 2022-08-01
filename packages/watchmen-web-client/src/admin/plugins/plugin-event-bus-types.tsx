import {Plugin} from '@/services/data/tuples/plugin-types';

export enum PluginEventTypes {
	PLUGIN_CODE_CHANGED = 'plugin-code-changed',
	PLUGIN_NAME_CHANGED = 'plugin-name-changed',
	PLUGIN_TENANT_CHANGED = 'plugin-tenant-changed',
	PLUGIN_TYPE_CHANGED = 'plugin-type-changed',
	PLUGIN_APPLY_TO_CHANGED = 'plugin-apply-to-changed'
}

export interface PluginEventBus {
	fire(type: PluginEventTypes.PLUGIN_CODE_CHANGED, writer: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_CODE_CHANGED, listener: (writer: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_CODE_CHANGED, listener: (writer: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_NAME_CHANGED, writer: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_NAME_CHANGED, listener: (writer: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_NAME_CHANGED, listener: (writer: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_TENANT_CHANGED, writer: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_TENANT_CHANGED, listener: (writer: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_TENANT_CHANGED, listener: (writer: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_TYPE_CHANGED, writer: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_TYPE_CHANGED, listener: (writer: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_TYPE_CHANGED, listener: (writer: Plugin) => void): this;

	fire(type: PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, writer: Plugin): this;
	on(type: PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, listener: (writer: Plugin) => void): this;
	off(type: PluginEventTypes.PLUGIN_APPLY_TO_CHANGED, listener: (writer: Plugin) => void): this;
}