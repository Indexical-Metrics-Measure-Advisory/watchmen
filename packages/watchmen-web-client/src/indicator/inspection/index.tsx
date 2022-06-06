import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {Inspection} from './inspection';
import {InspectionEventBusProvider} from './inspection-event-bus';

const IndicatorInspectionIndex = () => {
	return <InspectionEventBusProvider>
		<FixWidthPage>
			<PageHeader title={Lang.INDICATOR.INSPECTION.TITLE}/>
			<Inspection/>
		</FixWidthPage>
	</InspectionEventBusProvider>;
};

export default IndicatorInspectionIndex;