import React from 'react';
import {AggregateArithmetic} from './aggregate-arithmetic';
import {BucketOn} from './bucket-on';
import {Buttons} from './buttons';
import {CreateOrFind} from './create-or-find';
import {Data} from './data';
import {PickIndicator} from './pick-indicator';
import {TimeMeasureOn} from './time-measure-on';
import {TimePeriod} from './time-period';
import {IndicatorContainer, InspectionContainer} from './widgets';

export const Inspection = () => {
	return <InspectionContainer>
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