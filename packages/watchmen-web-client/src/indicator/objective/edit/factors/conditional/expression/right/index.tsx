import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorBaseOn} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameterExpression,
	ObjectiveParameterExpressionOperator,
	ObjectiveTimeFrameKind,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {isReferParameter} from '@/services/data/tuples/objective-utils';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {isBlank, isNotBlank} from '@/services/utils';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../../../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../../../../objectives-event-bus-types';
import {computeMeasureMethodOnColumn, computeMeasureMethodOnFactor} from '../../../../utils';
import {ParameterEventBusProvider} from '../../../parameter/parameter-event-bus';
import {useExpressionEventBus} from '../../event-bus/expression-event-bus';
import {ExpressionEventTypes} from '../../event-bus/expression-event-bus-types';
import {ExpressionSide} from '../expression-side';
import {Parameter2ExpressionBridge} from '../parameter-2-expression-bridge';

interface BucketState {
	bucketEnabled: boolean;
	buckets: Array<Bucket>;
	timeFrameEnabled: boolean;
}

const disableSpecialTypes = () => ({bucketEnabled: false, buckets: [], timeFrameEnabled: false});

export const RightPart = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	expression: ObjectiveParameterExpression;
}) => {
	// noinspection DuplicatedCode
	const {objective, factor, indicator, expression} = props;

	const {fire: fireObjective} = useObjectivesEventBus();
	const {on, off, fire} = useExpressionEventBus();
	const [specialTypes, setSpecialTypes] = useState<BucketState>(disableSpecialTypes());
	useEffect(() => {
		const gatherBucketIdsFromTopic = async (left: ReferObjectiveParameter): Promise<Array<BucketId>> => {
			if (indicator.baseOn !== IndicatorBaseOn.TOPIC) {
				return [];
			}
			const factorId = left.uuid;
			if (isBlank(factorId)) {
				return [];
			}
			return new Promise<Array<BucketId>>(resolve => {
				fireObjective(ObjectivesEventTypes.ASK_TOPIC, indicator.topicOrSubjectId, async (topic?: Topic) => {
					// eslint-disable-next-line
					const factor = topic?.factors?.find(factor => factor.factorId == factorId);
					if (factor == null) {
						resolve([]);
					} else {
						const bucketIds = (await Promise.all(computeMeasureMethodOnFactor(factor).map(method => {
							return new Promise<Array<BucketId>>(resolve => {
								fireObjective(ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, method, resolve);
							});
						}))).flat();
						const map: Record<BucketId, boolean> = {};
						bucketIds.filter(bucketId => isNotBlank(bucketId)).forEach(bucketId => map[`${bucketId}`] = true);
						resolve(Object.keys(map));
					}
				});
			});
		};
		const gatherBucketIdsFromSubject = async (left: ReferObjectiveParameter): Promise<Array<BucketId>> => {
			if (indicator.baseOn !== IndicatorBaseOn.SUBJECT) {
				return [];
			}
			const columnId = left.uuid;
			if (isBlank(columnId)) {
				return [];
			}
			return new Promise<Array<BucketId>>(resolve => {
				fireObjective(ObjectivesEventTypes.ASK_SUBJECT, indicator.topicOrSubjectId, async (subject?: SubjectForIndicator) => {
					// eslint-disable-next-line
					const column = subject?.dataset?.columns?.find(column => column.columnId == columnId);
					if (subject == null || column == null) {
						resolve([]);
					} else {
						const bucketIds = (await Promise.all(computeMeasureMethodOnColumn(column, subject).map(method => {
							return new Promise<Array<BucketId>>(resolve => {
								fireObjective(ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, method, resolve);
							});
						}))).flat();
						const map: Record<BucketId, boolean> = {};
						bucketIds.filter(bucketId => isNotBlank(bucketId)).forEach(bucketId => map[`${bucketId}`] = true);
						resolve(Object.keys(map));
					}
				});
			});
		};
		const computeSpecialTypes = async () => {
			const operator = expression.operator;
			if (operator !== ObjectiveParameterExpressionOperator.EQUALS && operator !== ObjectiveParameterExpressionOperator.NOT_EQUALS) {
				setSpecialTypes(disableSpecialTypes());
				return;
			}

			const left = expression.left;
			if (left == null || !isReferParameter(left)) {
				setSpecialTypes(disableSpecialTypes());
				return;
			}
			const timeFrameEnabled = objective.timeFrame != null && objective.timeFrame.kind != null && objective.timeFrame.kind !== ObjectiveTimeFrameKind.NONE;
			const bucketIds = (await Promise.all([gatherBucketIdsFromTopic(left), gatherBucketIdsFromSubject(left)])).flat();
			const buckets = (await Promise.all(bucketIds.map(bucketId => {
				return new Promise<Bucket | null>(resolve => {
					fireObjective(ObjectivesEventTypes.ASK_BUCKET, bucketId, (bucket?: Bucket) => resolve(bucket ?? null));
				});
			}))).filter(bucket => bucket != null) as Array<Bucket>;
			if (buckets.length === 0) {
				setSpecialTypes({bucketEnabled: false, buckets: [], timeFrameEnabled});
			} else {
				setSpecialTypes({bucketEnabled: true, buckets, timeFrameEnabled});
			}
		};
		const onLeftChanged = () => computeSpecialTypes();
		const onOperatorChanged = () => computeSpecialTypes();
		on(ExpressionEventTypes.LEFT_CHANGED, onLeftChanged);
		on(ExpressionEventTypes.OPERATOR_CHANGED, onOperatorChanged);
		return () => {
			off(ExpressionEventTypes.LEFT_CHANGED, onLeftChanged);
			off(ExpressionEventTypes.OPERATOR_CHANGED, onOperatorChanged);
		};
	}, [on, off, fireObjective, objective, indicator, expression]);

	const onRightParameterChanged = () => {
		fire(ExpressionEventTypes.RIGHT_CHANGED, expression);
	};

	return <ParameterEventBusProvider>
		<Parameter2ExpressionBridge onChange={onRightParameterChanged}/>
		<ExpressionSide objective={objective} factor={factor} indicator={indicator}
		                expression={expression} parameter={expression.right} leftSide={false}
		                bucketEnabled={specialTypes.bucketEnabled} buckets={specialTypes.buckets}
		                timeFrameEnabled={specialTypes.timeFrameEnabled}/>
	</ParameterEventBusProvider>;
};
