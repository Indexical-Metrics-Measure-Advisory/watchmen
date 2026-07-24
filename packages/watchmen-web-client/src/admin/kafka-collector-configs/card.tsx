import {QueryKafkaCollectorConfig} from '@/services/data/tuples/query-kafka-collector-config-types';
import {StandardTupleCard} from '@/widgets/tuple-workbench/tuple-card';
import React from 'react';

export const renderCard = (config: QueryKafkaCollectorConfig) => {
	return <StandardTupleCard key={config.configId} tuple={config}
	                          name={() => config.configCode}
	                          description={() => `${config.groupId || ''} @${config.tenantName || ''}`}/>;
};
