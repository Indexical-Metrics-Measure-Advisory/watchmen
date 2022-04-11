import {IndicatorList} from '@/indicator-workbench/indicator/list';
import React, {useState} from 'react';
import {Indicator} from './edit';
import {IndicatorState} from './indicator-state';
import {IndicatorsEventBusProvider} from './indicators-event-bus';

const IndicatorWorkbenchIndicatorIndex = () => {
	const [editing] = useState(true);

	return <IndicatorsEventBusProvider>
		<IndicatorState/>
		{editing ? <Indicator/> : <IndicatorList/>}
	</IndicatorsEventBusProvider>;
};

export default IndicatorWorkbenchIndicatorIndex;