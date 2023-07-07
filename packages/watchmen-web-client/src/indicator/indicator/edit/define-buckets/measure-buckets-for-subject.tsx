import {fetchBucketsByMethods} from '@/services/data/tuples/bucket';
import {EnumId} from '@/services/data/tuples/enum-types';
import {Indicator, MeasureMethod} from '@/services/data/tuples/indicator-types';
import {detectMeasures, findTopicAndFactor, isTimePeriodMeasure} from '@/services/data/tuples/indicator-utils';
import {
	QueryBucket,
	QueryByBucketMethod,
	QueryByEnumMethod,
	QueryByMeasureMethod
} from '@/services/data/tuples/query-bucket-types';
import {EnumForIndicator, SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectDataSetColumn, SubjectDataSetColumnId} from '@/services/data/tuples/subject-types';
import {isNotNull} from '@/services/data/utils';
import {Button} from '@/widgets/basic/button';
import {ICON_BUCKET, ICON_LIST_ICON_ASTERISK} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useState} from 'react';
import {MeasureColumn} from '../measure-column';
import {matchBuckets, uniqueMeasureMethods} from './utils';
import {
	MatchedMeasureBucketLabel,
	MatchedMeasureBuckets,
	MeasureBucketList,
	MeasureBucketsContainer,
	NoMeasureBucket,
	OrderedLabel
} from './widgets';

type Arranged = Array<{ column: SubjectDataSetColumn; enumId?: EnumId; methods: Array<MeasureMethod> }>;

const ColumnMeasureBuckets = (props: {
	methods: Array<MeasureMethod>;
	column: SubjectDataSetColumn;
	enumId?: EnumId;
	buckets: Array<QueryBucket>;
	enum?: EnumForIndicator;
}) => {
	const {methods, column, enumId, buckets, enum: enumeration} = props;

	const matchedBuckets = matchBuckets({methods, enumId, buckets});

	if (matchedBuckets.length === 0) {
		return null;
	}

	return <>
		<MeasureColumn column={column} enum={enumeration}/>
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

export const MeasureBucketsForSubject = (props: {
	indicator: Indicator;
	subject?: SubjectForIndicator,
	enums?: Array<EnumForIndicator>
}) => {
	const {subject, enums} = props;

	const {fire: fireGlobal} = useEventBus();
	const [shown, setShown] = useState(false);
	const [buckets, setBuckets] = useState<Array<QueryBucket>>([]);

	const onViewClicked = () => {
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => {
				const methods = detectMeasures(subject, (method) => !isTimePeriodMeasure(method))
					.map(measure => {
						if (measure.method !== MeasureMethod.ENUM) {
							return {method: measure.method} as QueryByMeasureMethod;
						} else {
							const factorId = measure.factorOrColumnId;
							if (factorId != null) {
								// eslint-disable-next-line
								const column = (subject?.dataset.columns || []).find(column => column.columnId == factorId);
								if (column != null) {
									const {factor} = findTopicAndFactor(column, subject);
									if (factor != null && factor.enumId != null) {
										return {method: MeasureMethod.ENUM, enumId: factor.enumId} as QueryByEnumMethod;
									} else {
										return null;
									}
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

	const columnGroups = detectMeasures(subject).reduce((groups, {method, factorOrColumnId}) => {
		let methods = groups[factorOrColumnId];
		if (methods == null) {
			methods = [];
			groups[factorOrColumnId] = methods;
		}
		methods.push(method);
		return groups;
	}, {} as Record<SubjectDataSetColumnId, Array<MeasureMethod>>);
	const arranged: Arranged = Object.keys(columnGroups).map(columnId => {
		// eslint-disable-next-line
		const column = (subject?.dataset.columns || []).find(column => column.columnId == columnId);
		if (column != null) {
			const {factor} = findTopicAndFactor(column, subject);
			if (factor != null) {
				return {column, enumId: factor.enumId, methods: columnGroups[columnId]};
			} else {
				return {column, methods: columnGroups[columnId]};
			}
		} else {
			return null;
		}
	}).filter(isNotNull).sort(({column: c1}, {column: c2}) => {
		return (c1.alias || '').localeCompare(c2.alias || '', void 0, {
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
					{arranged.map(({column, enumId, methods}) => {
						// eslint-disable-next-line
						const enumeration = enumId != null ? enums?.find(enumeration => enumeration.enumId == enumId) : (void 0);
						return <ColumnMeasureBuckets methods={methods} column={column} enumId={enumId}
						                             buckets={buckets} enum={enumeration}
						                             key={column.columnId}/>;
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