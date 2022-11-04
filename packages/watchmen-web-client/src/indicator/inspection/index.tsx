import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {Inspection} from './inspection';
import {InspectionEventBusProvider} from './inspection-event-bus';
import {InspectionStateHolder} from './state';

const IndicatorInspectionIndex = () => {
	useHelp(HELP_KEYS.IDW_INSPECTION);

	return <InspectionEventBusProvider>
		<InspectionStateHolder/>
		<FixWidthPage>
			<PageHeader title={Lang.INDICATOR.INSPECTION.TITLE}/>
			<Inspection/>
		</FixWidthPage>
	</InspectionEventBusProvider>;
};

export default IndicatorInspectionIndex;