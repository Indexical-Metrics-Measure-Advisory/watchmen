import {FullWidthPage} from '@/widgets/basic/page';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {AmbientBody, HeroHeader, HeroSubtitle, HeroTitle} from '../widgets/kit';
import {CatalogEventBusProvider} from './catalog-event-bus';
import {SearchCriteria} from './search-criteria';
import {SearchResult} from './search-result';
import {UserCache} from './user-cache';
import {Body} from './widgets';

const DataQualityCatalogIndex = () => {
	useHelp(HELP_KEYS.DQC_CATALOG);

	return <FullWidthPage>
		<AmbientBody>
			<HeroHeader>
				<div>
					<HeroTitle>Catalog</HeroTitle>
					<HeroSubtitle>Business catalogs, owners and attached monitor rules.</HeroSubtitle>
				</div>
			</HeroHeader>
			<Body>
				<CatalogEventBusProvider>
					<UserCache/>
					<SearchCriteria/>
					<SearchResult/>
				</CatalogEventBusProvider>
			</Body>
		</AmbientBody>
	</FullWidthPage>;
};

export default DataQualityCatalogIndex;
