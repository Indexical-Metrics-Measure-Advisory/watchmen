import React from 'react';
import {Indicator} from './edit';
import {IndicatorState} from './indicator-state';
import {IndicatorsEventBusProvider} from './indicators-event-bus';

const IndicatorWorkbenchIndicatorIndex = () => {
	// const [editing, setEditing] = useState(false);

	return <IndicatorsEventBusProvider>
		<IndicatorState/>
		<Indicator/>
	</IndicatorsEventBusProvider>;
};

export default IndicatorWorkbenchIndicatorIndex;