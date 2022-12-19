import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {
	Objective,
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket
} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {isNotBlank} from '@/services/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {useSave} from '../use-save';
import {AddItemButton} from '../widgets';
import {isBucketVariable} from './utils';
import {Variable} from './variable';
import {VariablesContainer} from './widgets';

export const Variables = (props: { objective: Objective }) => {
	const {objective} = props;

	if (objective.variables == null) {
		objective.variables = [];
	}

	const {fire} = useObjectivesEventBus();
	const [buckets, setBuckets] = useState<{ all: Array<QueryBucket>, selected: Array<Bucket> }>({
		all: [],
		selected: []
	});
	const save = useSave();
	useEffect(() => {
		fire(ObjectivesEventTypes.ASK_ALL_BUCKETS, (buckets: Array<QueryBucket>) => {
			if (buckets.length === 0) {
				// do nothing, no bucket
				return;
			}

			const selectedBucketIds: Array<BucketId> = (objective.variables || [])
				.filter(v => isBucketVariable(v) && isNotBlank(v.bucketId))
				.map(v => (v as ObjectiveVariableOnBucket).bucketId)
				.filter(bucketId => isNotBlank(bucketId)) as Array<BucketId>;
			fire(ObjectivesEventTypes.ASK_BUCKETS_DETAILS, selectedBucketIds, (selectedBuckets: Array<Bucket>) => {
				setBuckets({all: buckets, selected: selectedBuckets});
			});
		});
	}, [fire, objective.variables]);

	const onRemove = (variable: ObjectiveVariable) => {
		objective.variables!.splice(objective.variables!.indexOf(variable), 1);
		save(objective);
	};
	const onAddClicked = () => {
		objective.variables!.push({kind: ObjectiveVariableKind.SINGLE_VALUE} as ObjectiveVariable);
		save(objective);
	};

	const variables = objective.variables;
	const findSelectedBucket = (variable: ObjectiveVariable): Bucket | null => {
		if (!isBucketVariable(variable)) {
			return null;
		}
		const bucketId = variable.bucketId;
		if (!isNotBlank(bucketId)) {
			return null;
		}

		// eslint-disable-next-line
		return buckets.selected.find(bucket => bucket.bucketId == bucketId) ?? null;
	};

	return <EditStep index={ObjectiveDeclarationStep.VARIABLES} title={Lang.INDICATOR.OBJECTIVE.VARIABLES_TITLE}>
		<VariablesContainer>
			{variables.map((variable, index) => {
				return <Variable objective={objective} variable={variable} index={index + 1}
				                 onRemove={onRemove}
				                 buckets={buckets.all}
				                 selectedBucket={findSelectedBucket(variable)}
				                 key={`${variable.name || ''}-${index}`}/>;
			})}
			<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
				{Lang.INDICATOR.OBJECTIVE.ADD_VARIABLE}
			</AddItemButton>
		</VariablesContainer>
	</EditStep>;
};