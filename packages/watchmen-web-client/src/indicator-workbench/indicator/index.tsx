import React from 'react';
import {IndicatorState} from './indicator-state';
import {IndicatorsEventBusProvider} from './indicators-event-bus';
import IndicatorList from './list';

const IndicatorWorkbenchIndicatorIndex = () => {
	return <IndicatorsEventBusProvider>
		<IndicatorState/>
		<IndicatorList/>
		{/*<IndicatorEditor/>*/}
	</IndicatorsEventBusProvider>;
};

export default IndicatorWorkbenchIndicatorIndex;