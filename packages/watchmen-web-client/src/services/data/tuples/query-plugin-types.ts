import {Plugin} from './plugin-types';
import {QueryTuple} from './tuple-types';

export interface QueryPlugin extends Pick<Plugin, 'pluginId' | 'pluginCode' | 'name' | 'type' | 'applyTo' | 'params' | 'results' | 'createdAt' | 'lastModifiedAt'>, QueryTuple {
	tenantName: string;
}
