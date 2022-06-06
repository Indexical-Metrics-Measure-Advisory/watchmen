import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {ObjectiveAnalysisEventBusProvider} from './objective-analysis-event-bus';

const IndicatorWorkbenchObjectiveAnalysisIndex = () => {
	return <ObjectiveAnalysisEventBusProvider>
		<FullWidthPage>
			<FullWidthPageHeaderContainer>
				<PageTitle>{Lang.INDICATOR_WORKBENCH.OBJECTIVE_ANALYSIS.TITLE}</PageTitle>
			</FullWidthPageHeaderContainer>
		</FullWidthPage>
	</ObjectiveAnalysisEventBusProvider>;
};

export default IndicatorWorkbenchObjectiveAnalysisIndex;