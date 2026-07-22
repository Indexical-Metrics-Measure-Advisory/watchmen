import {isPiiClassificationEnabled} from '@/feature-switch';
import {Router} from '@/routes/types';
import {fetchPiiTerms} from '@/services/data/data-quality/pii';
import {PiiClassificationTerm} from '@/services/data/data-quality/pii-types';
import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useCallback, useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {PiiDiscoveryTab} from './discovery-tab';
import {PiiLineageTab} from './lineage-tab';
import {PiiReportTab} from './report-tab';
import {PiiTermsTab} from './terms-tab';
import {PiiBody, PiiTabContent, PiiTabHeader, PiiTabHeaders} from './widgets';

enum PiiTab {
	TERMS = 'terms',
	DISCOVERY = 'discovery',
	LINEAGE = 'lineage',
	REPORT = 'report'
}

const TABS: Array<{ key: PiiTab; label: string }> = [
	{key: PiiTab.TERMS, label: 'Terms'},
	{key: PiiTab.DISCOVERY, label: 'Discovery'},
	{key: PiiTab.LINEAGE, label: 'Lineage'},
	{key: PiiTab.REPORT, label: 'Report'}
];

const DataQualityPiiIndex = () => {
	const {fire: fireGlobal} = useEventBus();
	const [activeTab, setActiveTab] = useState<PiiTab>(PiiTab.TERMS);
	const [terms, setTerms] = useState<Array<PiiClassificationTerm>>([]);
	const enabled = isPiiClassificationEnabled();

	const loadTerms = useCallback(() => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => await fetchPiiTerms(),
			(loaded: Array<PiiClassificationTerm>) => setTerms(loaded ?? []));
	}, [fireGlobal]);

	useEffect(() => {
		if (enabled) {
			loadTerms();
		}
	}, [enabled, loadTerms]);

	if (!enabled) {
		return <Navigate to={Router.DQC_STATISTICS}/>;
	}

	return <FullWidthPage>
		<FullWidthPageHeaderContainer>
			<PageTitle>Data Classification</PageTitle>
		</FullWidthPageHeaderContainer>
		<PiiBody>
			<PiiTabHeaders>
				{TABS.map(tab => {
					return <PiiTabHeader key={tab.key} active={activeTab === tab.key}
					                     onClick={() => setActiveTab(tab.key)}>
						{tab.label}
					</PiiTabHeader>;
				})}
			</PiiTabHeaders>
			<PiiTabContent>
				{activeTab === PiiTab.TERMS
					? <PiiTermsTab terms={terms} onTermsChanged={loadTerms}/>
					: null}
				{activeTab === PiiTab.DISCOVERY
					? <PiiDiscoveryTab terms={terms} onTermsChanged={loadTerms}/>
					: null}
				{activeTab === PiiTab.LINEAGE
					? <PiiLineageTab terms={terms}/>
					: null}
				{activeTab === PiiTab.REPORT
					? <PiiReportTab/>
					: null}
			</PiiTabContent>
		</PiiBody>
	</FullWidthPage>;
};

export default DataQualityPiiIndex;
