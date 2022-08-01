import React, {useEffect, useState} from 'react';
import {AggregateArithmetic} from './aggregate-arithmetic';
import {BucketOn} from './bucket-on';
import {Buttons} from './buttons';
import {CreateOrFind} from './create-or-find';
import {Criteria} from './criteria';
import {Data} from './data';
import {useInspectionEventBus} from './inspection-event-bus';
import {InspectionEventTypes, InspectionRenderMode} from './inspection-event-bus-types';
import {PickIndicator} from './pick-indicator';
import {TimeMeasureOn} from './time-measure-on';
import {TimePeriod} from './time-period';
import {IndicatorContainer, InspectionContainer} from './widgets';

/**
 * when reusable is false, which means always create new inspection, no pick another inspection button shown.
 * And, most important part is, new inspection should be invoked outside by InspectionEventTypes.INSPECTION_PICKED after this component rendered.
 */
export const Inspection = (props: { reusable?: boolean }) => {
	const {reusable = true} = props;

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
			<CreateOrFind reusable={reusable}/>
			<PickIndicator/>
		</IndicatorContainer>
		<AggregateArithmetic/>
		<TimePeriod/>
		<Criteria/>
		<TimeMeasureOn/>
		<BucketOn/>
		<Buttons reusable={reusable}/>
		<Data/>
	</InspectionContainer>;
};