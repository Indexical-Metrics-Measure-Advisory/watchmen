import {Bucket} from '@/services/data/tuples/bucket-types';
import {Objective, ObjectiveVariable, ObjectiveVariableKind} from '@/services/data/tuples/objective-types';
import {isBucketVariable} from '@/services/data/tuples/objective-utils';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {isNotBlank, noop} from '@/services/utils';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {askVariableBucketIds} from '@/widgets/objective/utils';
import React, {useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {useAskBuckets} from '../hooks/use-ask-buckets';
import {ObjectiveDeclarationStep} from '../steps';
import {AddItemButton} from '../widgets';
import {Variable} from './variable';
import {VariablesContainer} from './widgets';

interface Buckets {
	initialized: boolean;
	all: Array<QueryBucket>;
	selected: Array<Bucket>;
}

export const Variables = (props: { objective: Objective }) => {
	const {objective} = props;

	if (objective.variables == null) {
		objective.variables = [];
	}

	const {fire} = useObjectivesEventBus();
	const [buckets, setBuckets] = useState<Buckets>({initialized: false, all: [], selected: []});
	useAskBuckets({
		objective,
		shouldStartAsk: () => !buckets.initialized,
		detailBucketIds: (objective) => Promise.resolve(askVariableBucketIds(objective)),
		onLoad: (all, details) => setBuckets({initialized: true, all, selected: details})
	});
	const forceUpdate = useForceUpdate();

	const onRemove = (variable: ObjectiveVariable) => {
		objective.variables!.splice(objective.variables!.indexOf(variable), 1);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onAddClicked = () => {
		objective.variables!.push({kind: ObjectiveVariableKind.SINGLE_VALUE} as ObjectiveVariable);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
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