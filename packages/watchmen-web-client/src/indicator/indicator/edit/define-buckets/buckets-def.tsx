import {IndicatorsData} from '../../indicators-event-bus-types';
import {IndicatorFactorBuckets} from './indicator-factor-buckets';
import {MeasureBucketsForSubject} from './measure-buckets-for-subject';
import {MeasureBucketsForTopic} from './measure-buckets-for-topic';
import {BucketsDefContainer} from './widgets';

export const BucketsDef = (props: { data: IndicatorsData }) => {
	const {data} = props;

	if (data.indicator == null) {
		return null;
	}

	return <BucketsDefContainer>
		<IndicatorFactorBuckets indicator={data.indicator}/>
		{data.topic != null
			? <MeasureBucketsForTopic indicator={data.indicator} topic={data.topic} enums={data.enums}/>
			: <MeasureBucketsForSubject indicator={data.indicator} subject={data.subject} enums={data.enums}/>}
	</BucketsDefContainer>;
};