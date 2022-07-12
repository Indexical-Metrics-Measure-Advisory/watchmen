import React, {useEffect, useState} from 'react';
import {AggregateArithmetic} from './aggregate-arithmetic';
import {BucketOn} from './bucket-on';
import {Buttons} from './buttons';
import {CreateOrFind} from './create-or-find';
import {Data} from './data';
import {useInspectionEventBus} from './inspection-event-bus';
import {InspectionEventTypes, InspectionRenderMode} from './inspection-event-bus-types';
import {PickIndicator} from './pick-indicator';
import {TimeMeasureOn} from './time-measure-on';
import {TimePeriod} from './time-period';
import {IndicatorContainer, InspectionContainer} from './widgets';

export const Inspection = () => {
	const {on, off} = useInspectionEventBus();
	const [renderMode, setRenderMode] = useState(InspectionRenderMode.EDIT);
	useEffect(() => {
		const onSwitchRenderMode = (renderMode: InspectionRenderMode) => {
			setRenderMode(renderMode);
		};
		on(InspectionEventTypes.SWITCH_RENDER_MODE, onSwitchRenderMode);
		return () => {
			off(InspectionEventTypes.SWITCH_RENDER_MODE, onSwitchRenderMode);
		};
	}, [on, off]);

	return <InspectionContainer renderMode={renderMode}>
		<IndicatorContainer>
			<CreateOrFind/>
			<PickIndicator/>
		</IndicatorContainer>
		<AggregateArithmetic/>
		<TimePeriod/>
		<TimeMeasureOn/>
		<BucketOn/>
		<Buttons/>
		<Data/>
	</InspectionContainer>;
};