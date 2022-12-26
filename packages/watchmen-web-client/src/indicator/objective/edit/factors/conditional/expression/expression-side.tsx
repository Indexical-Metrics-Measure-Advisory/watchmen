import {Bucket} from '@/services/data/tuples/bucket-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameter,
	ObjectiveParameterExpression
} from '@/services/data/tuples/objective-types';
import React from 'react';
import {BucketEditor} from '../../parameter/bucket';
import {ComputedEditor} from '../../parameter/compute';
import {ConstantEditor} from '../../parameter/constant';
import {FactorEditor} from '../../parameter/factor';
import {ParameterFromEditor} from '../../parameter/param-from';
import {ExpressionSideContainer} from './widgets';

export const ExpressionSide = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	expression: ObjectiveParameterExpression; parameter: ObjectiveParameter; leftSide: boolean;
	bucketEnabled?: boolean; buckets?: Array<Bucket>; timeFrameEnabled?: boolean;
}) => {
	const {objective, factor, indicator, parameter, leftSide} = props;
	const {bucketEnabled, buckets, timeFrameEnabled} = (() => {
		if (leftSide) {
			// disable bucket selection on left side
			return {bucketEnabled: false, buckets: [], timeFrameEnabled: false};
		} else {
			const {bucketEnabled = false, buckets = [], timeFrameEnabled} = props;
			return {bucketEnabled, buckets, timeFrameEnabled};
		}
	})();

	return <ExpressionSideContainer>
		<ParameterFromEditor parameter={parameter} bucketEnabled={bucketEnabled} timeFrameEnabled={timeFrameEnabled}/>
		<FactorEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<ConstantEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<ComputedEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
		<BucketEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}
		              buckets={buckets}/>
	</ExpressionSideContainer>;
};