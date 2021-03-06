import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {CatalogEventBusProvider} from './catalog-event-bus';
import {SearchCriteria} from './search-criteria';
import {SearchResult} from './search-result';
import {UserCache} from './user-cache';
import {Body} from './widgets';

const DataQualityCatalogIndex = () => {
	useHelp(HELP_KEYS.DQC_CATALOG);

	return <FullWidthPage>
		<FullWidthPageHeaderContainer>
			<PageTitle>Catalog</PageTitle>
		</FullWidthPageHeaderContainer>
		<Body>
			<CatalogEventBusProvider>
				<UserCache/>
				<SearchCriteria/>
				<SearchResult/>
			</CatalogEventBusProvider>
		</Body>
	</FullWidthPage>;
};

export default DataQualityCatalogIndex;