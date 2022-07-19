import {buildBucketsAskingParams} from '../utils';
import {Bucket} from '@/services/data/tuples/bucket-types';
import {isMeasureBucket} from '@/services/data/tuples/bucket-utils';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useInspectionEventBus} from '../inspection-event-bus';
import {InspectionEventTypes} from '../inspection-event-bus-types';
import {useVisibleOnII} from '../use-visible-on-ii';
import {InspectionLabel} from '../widgets';
import {CriteriaEditor} from './criteria-editor';
import {IndicatorCriteriaDefData} from './types';
import {buildFactorOptions} from './utils';
import {CriteriaContainer, CriteriaRows} from './widgets';

export const Criteria = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useInspectionEventBus();
	const [defData, setDefData] = useState<IndicatorCriteriaDefData>({
		loaded: false,
		valueBuckets: [],
		measureBuckets: []
	});
	const {visible, inspection, indicator} = useVisibleOnII();
	useEffect(() => {
		if (indicator == null) {
			setDefData({loaded: false, valueBuckets: [], measureBuckets: []});
			return;
		}

		(async () => {
			const params = buildBucketsAskingParams(indicator.indicator, indicator.topic, indicator.subject);
			const askBuckets = async (): Promise<Array<QueryBucket>> => {
				return new Promise(resolve => {
					fire(InspectionEventTypes.ASK_BUCKETS, params, (buckets: Array<QueryBucket>) => {
						resolve(buckets);
					});
				});
			};
			const buckets = await askBuckets();
			if (indicator.topic != null) {
				setDefData({
					loaded: true,
					topic: indicator.topic as Topic,
					subject: (void 0),
					valueBuckets: buckets.filter(bucket => !isMeasureBucket(bucket)) as Array<Bucket>,
					measureBuckets: buckets.filter(bucket => isMeasureBucket(bucket)) as Array<Bucket>
				});
			} else if (indicator.subject != null) {
				setDefData({
					loaded: true,
					topic: (void 0),
					subject: indicator.subject,
					valueBuckets: buckets.filter(bucket => !isMeasureBucket(bucket)) as Array<Bucket>,
					measureBuckets: buckets.filter(bucket => isMeasureBucket(bucket)) as Array<Bucket>
				});
			} else {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{Lang.ERROR.UNPREDICTED}</AlertLabel>);
			}
		})();
	}, [fireGlobal, fire, indicator]);

	if (!visible || !defData.loaded) {
		return null;
	}

	const criteriaList = [...(inspection?.criteria || []), {}];
	const factorOptions = buildFactorOptions(defData);

	return <CriteriaContainer>
		<InspectionLabel>{Lang.INDICATOR.INSPECTION.CRITERIA_LABEL}</InspectionLabel>
		<CriteriaRows>
			{criteriaList.map(criteria => {
				return <CriteriaEditor inspection={inspection!} criteria={criteria} indicator={indicator!.indicator}
				                       factorCandidates={factorOptions} defData={defData}/>;
			})}
		</CriteriaRows>
	</CriteriaContainer>;
};