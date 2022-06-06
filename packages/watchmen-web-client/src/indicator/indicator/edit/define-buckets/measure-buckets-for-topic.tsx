import {fetchBucketsByMethods} from '@/services/data/tuples/bucket';
import {Factor, FactorId} from '@/services/data/tuples/factor-types';
import {Indicator, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {detectMeasures, isTimePeriodMeasure} from '@/services/data/tuples/indicator-utils';
import {
	QueryBucket,
	QueryByBucketMethod,
	QueryByEnumMethod,
	QueryByMeasureMethod
} from '@/services/data/tuples/query-bucket-types';
import {EnumForIndicator, TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {isNotNull} from '@/services/data/utils';
import {Button} from '@/widgets/basic/button';
import {ICON_BUCKET, ICON_LIST_ICON_ASTERISK} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useState} from 'react';
import {MeasureFactor} from '../measure-factor';
import {matchBuckets, uniqueMeasureMethods} from './utils';
import {
	MatchedMeasureBucketLabel,
	MatchedMeasureBuckets,
	MeasureBucketList,
	MeasureBucketsContainer,
	NoMeasureBucket,
	OrderedLabel
} from './widgets';

const FactorMeasureBuckets = (props: {
	methods: Array<MeasureMethod>;
	factor: Factor;
	buckets: Array<QueryBucket>;
	enum?: EnumForIndicator;
}) => {
	const {methods, factor, buckets, enum: enumeration} = props;

	const matchedBuckets = matchBuckets({methods, enumId: factor.enumId, buckets});

	if (matchedBuckets.length === 0) {
		return null;
	}

	return <>
		<MeasureFactor factor={factor} enum={enumeration}/>
		<MatchedMeasureBuckets>
			{matchedBuckets.map(bucket => {
				return <MatchedMeasureBucketLabel key={bucket.bucketId}>
					<FontAwesomeIcon icon={ICON_BUCKET}/>
					<span>{bucket.name || 'Noname Bucket'}</span>
				</MatchedMeasureBucketLabel>;
			})}
		</MatchedMeasureBuckets>
	</>;
};

export const MeasureBucketsForTopic = (props: { indicator: Indicator; topic?: TopicForIndicator, enums?: Array<EnumForIndicator> }) => {
	const {topic, enums} = props;

	const {fire: fireGlobal} = useEventBus();
	const [shown, setShown] = useState(false);
	const [buckets, setBuckets] = useState<Array<QueryBucket>>([]);

	const onViewClicked = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => {
				const methods = detectMeasures(topic, (method) => !isTimePeriodMeasure(method))
					.map(measure => {
						if (measure.method !== MeasureMethod.ENUM) {
							return {method: measure.method} as QueryByMeasureMethod;
						} else {
							const factorId = measure.factorOrColumnId;
							if (factorId != null) {
								// eslint-disable-next-line
								const factor = (topic?.factors || []).find(factor => factor.factorId == factorId);
								if (factor != null && factor.enumId != null) {
									return {method: MeasureMethod.ENUM, enumId: factor.enumId} as QueryByEnumMethod;
								}
							}
							return null;
						}
					})
					.filter(isNotNull) as Array<QueryByBucketMethod>;
				const uniqueMethods = uniqueMeasureMethods(methods);
				if (uniqueMethods.length === 0) {
					return [];
				} else {
					return await fetchBucketsByMethods(uniqueMethods);
				}
			},
			(buckets: Array<QueryBucket>) => {
				setBuckets(buckets);
				setShown(true);
			});
	};

	const factorGroups = detectMeasures(topic).reduce((groups, {method, factorOrColumnId}) => {
		let methods = groups[factorOrColumnId];
		if (methods == null) {
			methods = [];
			groups[factorOrColumnId] = methods;
		}
		methods.push(method);
		return groups;
	}, {} as Record<FactorId, Array<MeasureMethod>>);
	const arranged = Object.keys(factorGroups).map(factorId => {
		// eslint-disable-next-line
		const factor = (topic?.factors || []).find(factor => factor.factorId == factorId);
		if (factor != null) {
			return {factor, methods: factorGroups[factorId]};
		} else {
			return null;
		}
	}).filter(isNotNull).sort(({factor: f1}, {factor: f2}) => {
		return (f1.name || '').localeCompare(f2.name || '', void 0, {
			caseFirst: 'upper',
			sensitivity: 'base'
		});
	});

	return <MeasureBucketsContainer>
		<OrderedLabel>
			<FontAwesomeIcon icon={ICON_LIST_ICON_ASTERISK}/>
			<span>{Lang.INDICATOR.INDICATOR.MEASURE_BUCKET_LABEL}</span>
		</OrderedLabel>
		{shown
			? <>
				<MeasureBucketList>
					{arranged.map(({factor, methods}) => {
						// eslint-disable-next-line
						const enumeration = factor.enumId != null ? enums?.find(enumeration => enumeration.enumId == factor.enumId) : (void 0);
						return <FactorMeasureBuckets methods={methods} factor={factor} buckets={buckets}
						                             enum={enumeration}
						                             key={factor.factorId}/>;
					})}
				</MeasureBucketList>
				<NoMeasureBucket>{Lang.INDICATOR.INDICATOR.NO_MEASURE_BUCKET}</NoMeasureBucket>
			</>
			: null}
		<Button ink={ButtonInk.PRIMARY} onClick={onViewClicked}>
			{Lang.INDICATOR.INDICATOR.VIEW_MEASURE_BUCKETS}
		</Button>
	</MeasureBucketsContainer>;
};