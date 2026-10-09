import {FullWidthPage} from '@/widgets/basic/page';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {AmbientBody, HeroHeader, HeroSubtitle, HeroTitle} from '../widgets/kit';
import {RulesEventBusProvider} from './rules-event-bus';
import {SearchCriteria} from './search-criteria';
import {SearchResult} from './search-result';
import {Body} from './widgets';

const DataQualityMonitorRulesIndex = () => {
	useHelp(HELP_KEYS.DQC_MONITOR_RULES);

	return <FullWidthPage>
		<AmbientBody>
			<HeroHeader>
				<div>
					<HeroTitle>Monitor Rules</HeroTitle>
					<HeroSubtitle>Define and run topic, factor and global monitor rules.</HeroSubtitle>
				</div>
			</HeroHeader>
			<Body>
				<RulesEventBusProvider>
					<SearchCriteria/>
					<SearchResult/>
				</RulesEventBusProvider>
			</Body>
		</AmbientBody>
	</FullWidthPage>;
};

export default DataQualityMonitorRulesIndex;
