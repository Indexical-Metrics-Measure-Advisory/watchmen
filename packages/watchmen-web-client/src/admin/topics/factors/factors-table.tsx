import {QueryEnumForHolder} from '@/services/data/tuples/query-enum-types';
import {Topic} from '@/services/data/tuples/topic-types';
import React from 'react';
import {FactorAddButton} from './factor-add-button';
import {FactorsImportButton} from './factors-import-button';
import {FactorsTableBody} from './factors-table-body';
import {FactorsTableHeader} from './factors-table-header';
import {ImportMetaDataButton} from './import-meta-data-button';
import {ParseFlattenPipelinesButton} from './parse-flatten-pipelines-button';
import {FactorsTableContainer, FactorsTableFooter} from './widgets';

export const FactorsTable = (props: { topic: Topic, enums: Array<QueryEnumForHolder> }) => {
	const {topic, enums} = props;

	return <FactorsTableContainer>
		<FactorsTableHeader topic={topic}/>
		<FactorsTableBody topic={topic} enums={enums}/>
		<FactorsTableFooter>
			<FactorAddButton topic={topic}/>
			<ParseFlattenPipelinesButton topic={topic}/>
			<ImportMetaDataButton topic={topic}/>
			<FactorsImportButton topic={topic}/>
		</FactorsTableFooter>
	</FactorsTableContainer>;
};