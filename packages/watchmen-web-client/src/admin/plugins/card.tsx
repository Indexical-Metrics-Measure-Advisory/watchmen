import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {StandardTupleCard} from '@/widgets/tuple-workbench/tuple-card';
import React from 'react';

export const renderCard = (plugin: QueryPlugin) => {
	return <StandardTupleCard key={plugin.pluginId} tuple={plugin}
	                          name={() => plugin.pluginCode}
	                          description={() => `${plugin.type || ''} @${plugin.tenantName || ''}`}/>;
};