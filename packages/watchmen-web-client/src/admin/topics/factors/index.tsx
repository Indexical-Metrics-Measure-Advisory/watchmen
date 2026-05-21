import {DataSourceType} from '@/services/data/tuples/data-source-types';
import {QueryEnumForHolder} from '@/services/data/tuples/query-enum-types';
import {Topic} from '@/services/data/tuples/topic-types';
import React from 'react';
import {FactorsButton} from './factors-button';
import {FactorsTable} from './factors-table';

export const Factors = (props: { topic: Topic, enums: Array<QueryEnumForHolder>, dataSourceType?: DataSourceType }) => {
	const {topic, enums, dataSourceType} = props;

	return <>
		<FactorsButton topic={topic}/>
		<FactorsTable topic={topic} enums={enums} dataSourceType={dataSourceType}/>
	</>;
};