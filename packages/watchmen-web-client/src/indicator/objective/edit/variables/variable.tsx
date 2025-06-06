import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {
	Objective,
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange
} from '@/services/data/tuples/objective-types';
import {isBucketVariable, isRangeVariable, isValueVariable} from '@/services/data/tuples/objective-utils';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {noop} from '@/services/utils';
import {Button} from '@/widgets/basic/button';
import {ICON_COLLAPSE_CONTENT, ICON_DELETE, ICON_EDIT} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {buildBucketOptions} from '@/widgets/objective/utils';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, MouseEvent, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {defendVariableAndRemoveUnnecessary} from '../utils';
import {ItemLabel, ItemNo, RemoveItemButton} from '../widgets';
import {
	VariableContainer,
	VariableKindButton,
	VariableKindContainer,
	VariableKindIcon,
	VariableValuesContainer
} from './widgets';

const VariableValues = (props: {
	objective: Objective;
	variable: ObjectiveVariable;
	buckets: Array<QueryBucket>;
	selectedBucket: Bucket | null;
}) => {
	const {objective, variable, buckets, selectedBucket: initSelectedBucket} = props;

	const {fire} = useObjectivesEventBus();
	const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(initSelectedBucket);
	const forceUpdate = useForceUpdate();

	const onValueChanged = (key: 'value' | 'min' | 'max') => (event: ChangeEvent<HTMLInputElement>) => {
		(variable as any)[key] = event.target.value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onIncludeChanged = (key: 'includeMin' | 'includeMax') => () => {
		(variable as ObjectiveVariableOnRange)[key] = !(variable as ObjectiveVariableOnRange)[key];
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onBucketChanged = (option: DropdownOption) => {
		const variableOnBucket = variable as ObjectiveVariableOnBucket;
		const bucketId = option.value as BucketId;
		// eslint-disable-next-line
		if (bucketId == variableOnBucket.bucketId || bucketId === '') {
			return;
		}

		variableOnBucket.bucketId = bucketId;
		delete variableOnBucket.segmentName;

		fire(ObjectivesEventTypes.ASK_BUCKET, bucketId, (bucket?: Bucket) => {
			setSelectedBucket(bucket ?? null);
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
			forceUpdate();
		});
	};
	const onSegmentChanged = (option: DropdownOption) => {
		const variableOnBucket = variable as ObjectiveVariableOnBucket;
		const segmentName = option.value as string;
		if (segmentName === '') {
			return;
		}
		variableOnBucket.segmentName = segmentName;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};

	const {buckets: bucketOptions, segments: segmentOptions} = buildBucketOptions(variable, buckets, selectedBucket);

	return <VariableValuesContainer>
		{isValueVariable(variable) ? <Input value={variable.value ?? ''} onChange={onValueChanged('value')}/> : null}
		{isRangeVariable(variable)
			? <>
				<Button onClick={onIncludeChanged('includeMin')}>
					{variable.includeMin ? Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_INCLUDE_MIN : Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_NOT_INCLUDE_MIN}
				</Button>
				<Input value={variable.min ?? ''} onChange={onValueChanged('min')}/>
				<ItemLabel>{Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_TO}</ItemLabel>
				<Input value={variable.max ?? ''} onChange={onValueChanged('max')}/>
				<Button onClick={onIncludeChanged('includeMax')}>
					{variable.includeMax ? Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_INCLUDE_MAX : Lang.INDICATOR.OBJECTIVE.VARIABLE_RANGE_NOT_INCLUDE_MAX}
				</Button>
			</> : null}
		{isBucketVariable(variable)
			? <>
				<Dropdown value={variable.bucketId} options={bucketOptions} onChange={onBucketChanged}
				          please={Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_PLACEHOLDER}/>
				<Dropdown value={variable.segmentName} options={segmentOptions} onChange={onSegmentChanged}
				          please={Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SEGMENT_PLACEHOLDER}/>
			</> : null}
	</VariableValuesContainer>;
};

export const Variable = (props: {
	objective: Objective;
	variable: ObjectiveVariable;
	index: number;
	onRemove: (variable: ObjectiveVariable) => void;
	buckets: Array<QueryBucket>;
	selectedBucket: Bucket | null;
}) => {
	const {objective, variable, index, onRemove, buckets, selectedBucket} = props;

	const {fire} = useObjectivesEventBus();
	const [editing, setEditing] = useState(false);
	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		variable.name = value;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onStartEditing = () => setEditing(true);
	const onBlur = () => setEditing(false);
	const onKindChanged = (kind: ObjectiveVariableKind) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (kind === variable.kind) {
			// do nothing, discard or start editing
			setEditing(!editing);
		} else {
			variable.kind = kind;
			defendVariableAndRemoveUnnecessary(variable);
			setEditing(false);
			fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
			forceUpdate();
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setEditing(!editing);
	};
	const onRemoveClicked = () => onRemove(variable);

	const kinds = {
		[ObjectiveVariableKind.SINGLE_VALUE]: Lang.INDICATOR.OBJECTIVE.VARIABLE_KIND_SINGLE_VALUE,
		[ObjectiveVariableKind.RANGE]: Lang.INDICATOR.OBJECTIVE.VARIABLE_KIND_RANGE,
		[ObjectiveVariableKind.BUCKET]: Lang.INDICATOR.OBJECTIVE.VARIABLE_KIND_BUCKET
	};
	const kindCandidates = [
		ObjectiveVariableKind.SINGLE_VALUE, ObjectiveVariableKind.RANGE, ObjectiveVariableKind.BUCKET
	].filter(kind => kind !== variable.kind);

	return <VariableContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<Input value={variable.name || ''} onChange={onNameChanged}
		       placeholder={Lang.PLAIN.OBJECTIVE_VARIABLE_NAME_PLACEHOLDER}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.VARIABLE_IS}</ItemLabel>
		<VariableKindContainer onClick={onStartEditing} tabIndex={0} onBlur={onBlur}>
			<VariableKindButton active={true} edit={editing} onClick={onKindChanged(variable.kind)}>
				{kinds[variable.kind]}
			</VariableKindButton>
			{kindCandidates.map(candidate => {
				return <VariableKindButton active={false} edit={editing} onClick={onKindChanged(candidate)}
				                           key={candidate}>
					{kinds[candidate]}
				</VariableKindButton>;
			})}
			<VariableKindIcon onClick={onIconClicked} data-expanded={editing}>
				{editing ? <FontAwesomeIcon icon={ICON_COLLAPSE_CONTENT}/> : <FontAwesomeIcon icon={ICON_EDIT}/>}
			</VariableKindIcon>
		</VariableKindContainer>
		<VariableValues objective={objective} variable={variable} buckets={buckets} selectedBucket={selectedBucket}/>
		<RemoveItemButton ink={ButtonInk.DANGER} data-as-icon={true} onClick={onRemoveClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveItemButton>
	</VariableContainer>;
};