import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {GovernanceEventBusProvider} from './governance-event-bus';

const IndicatorWorkbenchGovernanceIndex = () => {
	return <GovernanceEventBusProvider>
		<FullWidthPage>
			<FullWidthPageHeaderContainer>
				<PageTitle>{Lang.INDICATOR_WORKBENCH.GOVERNANCE.TITLE}</PageTitle>
			</FullWidthPageHeaderContainer>
		</FullWidthPage>
	</GovernanceEventBusProvider>;
};

export default IndicatorWorkbenchGovernanceIndex;