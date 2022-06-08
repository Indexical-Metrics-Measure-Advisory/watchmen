import {FullWidthPage} from '@/widgets/basic/page';
import {FullWidthPageHeaderContainer, PageTitle} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {DataHolder} from './data-holder';
import {ObjectiveAnalysisNavigator, ObjectiveAnalysisNavigatorControlButton} from './navigator';
import {ObjectiveAnalysisEventBusProvider} from './objective-analysis-event-bus';
import {ObjectiveAnalysisBody} from './widgets';

const IndicatorObjectiveAnalysisIndex = () => {
	return <ObjectiveAnalysisEventBusProvider>
		<DataHolder/>
		<FullWidthPage>
			<FullWidthPageHeaderContainer>
				<PageTitle>{Lang.INDICATOR.OBJECTIVE_ANALYSIS.TITLE}</PageTitle>
			</FullWidthPageHeaderContainer>
			<ObjectiveAnalysisBody>
				<ObjectiveAnalysisNavigator/>
				<ObjectiveAnalysisNavigatorControlButton/>
			</ObjectiveAnalysisBody>
		</FullWidthPage>
	</ObjectiveAnalysisEventBusProvider>;
};

export default IndicatorObjectiveAnalysisIndex;