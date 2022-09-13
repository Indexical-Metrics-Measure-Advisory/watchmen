import {Inspection} from '@/services/data/tuples/inspection-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {ICON_LOADING} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useInspectionEventBus} from '../inspection-event-bus';
import {IndicatorForInspection, InspectionEventTypes} from '../inspection-event-bus-types';
import {buildBucketsAskingParams} from '../utils';
import {InspectionLabel, LoadingLabel} from '../widgets';
import {BucketOnEditor} from './bucket-on-editor';
import {Buckets} from './types';
import {BucketOnContainer, BucketOnRows} from './widgets';

export const BucketOn = () => {
	const {on, off, fire} = useInspectionEventBus();
	const [visible, setVisible] = useState(false);
	const [inspection, setInspection] = useState<Inspection | null>(null);
	const [indicator, setIndicator] = useState<IndicatorForInspection | null>(null);
	const [buckets, setBuckets] = useState<Buckets>({loaded: false, data: []});

	useEffect(() => {
		const askBuckets = async ({indicator, topic, subject}: IndicatorForInspection): Promise<Array<QueryBucket>> => {
			return new Promise(resolve => {
				fire(InspectionEventTypes.ASK_BUCKETS, buildBucketsAskingParams(indicator, topic, subject), (buckets: Array<QueryBucket>) => {
					resolve(buckets);
				});
			});
		};
		const loadBuckets = async (indicator: IndicatorForInspection) => {
			const buckets = await askBuckets(indicator);
			setBuckets({loaded: true, data: buckets});
		};
		const onIndicatorPicked = async (indicator: IndicatorForInspection) => {
			setIndicator(indicator);
			setVisible(true);
			await loadBuckets(indicator);
		};
		const onInspectionPicked = async (inspection: Inspection, indicator?: IndicatorForInspection) => {
			setInspection(inspection);
			if (inspection.indicatorId != null) {
				await onIndicatorPicked(indicator!);
			}
		};
		on(InspectionEventTypes.INDICATOR_PICKED, onIndicatorPicked);
		on(InspectionEventTypes.INSPECTION_PICKED, onInspectionPicked);
		return () => {
			off(InspectionEventTypes.INDICATOR_PICKED, onIndicatorPicked);
			off(InspectionEventTypes.INSPECTION_PICKED, onInspectionPicked);
		};
	}, [on, off, fire]);
	useEffect(() => {
		const onInspectionCleared = () => {
			setVisible(false);
			setBuckets({loaded: false, data: []});
			setIndicator(null);
			setInspection(null);
		};
		on(InspectionEventTypes.INSPECTION_CLEARED, onInspectionCleared);
		return () => {
			off(InspectionEventTypes.INSPECTION_CLEARED, onInspectionCleared);
		};
	}, [on, off]);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onBucketOnAdded = () => forceUpdate();
		const onBucketOnRemoved = () => forceUpdate();
		on(InspectionEventTypes.BUCKET_ON_ADDED, onBucketOnAdded);
		on(InspectionEventTypes.BUCKET_ON_REMOVED, onBucketOnRemoved);
		return () => {
			off(InspectionEventTypes.BUCKET_ON_ADDED, onBucketOnAdded);
			off(InspectionEventTypes.BUCKET_ON_REMOVED, onBucketOnRemoved);
		};
	}, [on, off, forceUpdate]);

	if (!visible) {
		return null;
	}

	if (!buckets.loaded) {
		return <BucketOnContainer>
			<InspectionLabel>{Lang.INDICATOR.INSPECTION.SELECT_BUCKETING_ON_LABEL}</InspectionLabel>
			<LoadingLabel>
				<FontAwesomeIcon icon={ICON_LOADING} spin={true}/>
				<span>{Lang.PLAIN.LOADING}</span>
			</LoadingLabel>
		</BucketOnContainer>;
	}

	const measures = [...(inspection?.measures || []), {}];

	return <BucketOnContainer>
		<InspectionLabel>{Lang.INDICATOR.INSPECTION.SELECT_BUCKETING_ON_LABEL}</InspectionLabel>
		<BucketOnRows>
			{measures.map(measureOn => {
				return <BucketOnEditor inspection={inspection!}
				                       measure={measureOn}
				                       indicator={indicator!} buckets={buckets}
				                       key={v4()}/>;
			})}
		</BucketOnRows>
	</BucketOnContainer>;
};