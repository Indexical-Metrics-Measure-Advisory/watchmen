import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {
	Objective,
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange,
	ObjectiveVariableOnValue
} from '@/services/data/tuples/objective-types';
import {isNotBlank} from '@/services/utils';
import {Button} from '@/widgets/basic/button';
import {ICON_COLLAPSE_CONTENT, ICON_DELETE, ICON_EDIT} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, MouseEvent, useState} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {useSave} from './use-save';
import {
	AddItemButton,
	IncorrectOptionLabel,
	ItemLabel,
	ItemNo,
	RemoveItemButton,
	VariableContainer,
	VariableKindButton,
	VariableKindContainer,
	VariableKindIcon,
	VariablesContainer,
	VariableValuesContainer
} from './widgets';

const isValueVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnValue => variable.kind === ObjectiveVariableKind.SINGLE_VALUE;
const isRangeVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnRange => variable.kind === ObjectiveVariableKind.RANGE;
const isBucketVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnBucket => variable.kind === ObjectiveVariableKind.BUCKET;
const defendVariableAndRemoveUnnecessary = (variable: ObjectiveVariable) => {
	if (isValueVariable(variable)) {
		variable.value = variable.value ?? (variable as unknown as ObjectiveVariableOnRange).min;
		delete (variable as unknown as ObjectiveVariableOnRange).min;
		delete (variable as unknown as ObjectiveVariableOnRange).max;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMin;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMax;
		delete (variable as unknown as ObjectiveVariableOnBucket).bucketId;
		delete (variable as unknown as ObjectiveVariableOnBucket).segmentName;
	} else if (isRangeVariable(variable)) {
		variable.min = variable.min ?? (variable as unknown as ObjectiveVariableOnValue).value;
		variable.includeMin = variable.includeMin ?? true;
		variable.includeMax = variable.includeMax ?? true;
		delete (variable as unknown as ObjectiveVariableOnValue).value;
		delete (variable as unknown as ObjectiveVariableOnBucket).bucketId;
		delete (variable as unknown as ObjectiveVariableOnBucket).segmentName;
	} else if (isBucketVariable(variable)) {
		delete (variable as unknown as ObjectiveVariableOnValue).value;
		delete (variable as unknown as ObjectiveVariableOnRange).min;
		delete (variable as unknown as ObjectiveVariableOnRange).max;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMin;
		delete (variable as unknown as ObjectiveVariableOnRange).includeMax;
	}
};

const VariableValues = (props: {
	objective: Objective;
	variable: ObjectiveVariable;
	buckets: Array<Bucket>;
}) => {
	const {objective, variable, buckets} = props;

	const save = useSave();

	const onValueChanged = (key: 'value' | 'min' | 'max') => (event: ChangeEvent<HTMLInputElement>) => {
		(variable as any)[key] = event.target.value;
		save(objective);
	};
	const onIncludeChanged = (key: 'includeMin' | 'includeMax') => () => {
		(variable as ObjectiveVariableOnRange)[key] = !(variable as ObjectiveVariableOnRange)[key];
		save(objective);
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
		save(objective);
	};
	const onSegmentChanged = (option: DropdownOption) => {
		const variableOnBucket = variable as ObjectiveVariableOnBucket;
		const segmentName = option.value as string;
		if (segmentName === '') {
			return;
		}
		variableOnBucket.segmentName = segmentName;
		save(objective);
	};

	const {buckets: bucketOptions, segments: segmentOptions} = (() => {
		if (!isBucketVariable(variable)) {
			return {buckets: [], segments: []};
		}

		const bucketOptions: Array<DropdownOption> = buckets.map(bucket => {
			return {value: bucket.bucketId, label: bucket.name};
		}).sort((b1, b2) => {
			return (b1.label || '').toLowerCase().localeCompare((b2.label || '').toLowerCase());
		});
		let segmentOptions: Array<DropdownOption> = [];
		if (isNotBlank(variable.bucketId)) {
			// bucket selected
			// eslint-disable-next-line
			const bucketFound = buckets.find(b => b.bucketId == variable.bucketId);
			if (bucketFound == null) {
				// selected bucket not found
				bucketOptions.push({
					value: variable.bucketId!, label: () => {
						return {
							node: <IncorrectOptionLabel>
								{Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_INCORRECT_SELECTED}
							</IncorrectOptionLabel>, label: ''
						};
					}
				} as DropdownOption);
				if (isNotBlank(variable.segmentName)) {
					segmentOptions.push({
						value: variable.segmentName, label: () => {
							return {
								node: <IncorrectOptionLabel>
									{Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SEGMENT_INCORRECT_SELECTED}
								</IncorrectOptionLabel>, label: ''
							};
						}
					});
				}
			} else {
				// selected bucket found
				segmentOptions = (() => {
					if (isBucketVariable(variable) && variable.bucketId != null) {
						// eslint-disable-next-line
						return (buckets.find(bucket => bucket.bucketId == variable.bucketId)?.segments || []).map(segment => {
							return {value: segment.name, label: segment.name};
						}).sort((s1, s2) => {
							return (s1.label || '').toLowerCase().localeCompare((s2.label || '').toLowerCase());
						});
					} else {
						return [];
					}
				})();
				if (isNotBlank(variable.segmentName)) {
					// eslint-disable-next-line
					const segmentFound = (bucketFound.segments || []).find(s => s.name == variable.segmentName);
					if (segmentFound == null) {
						segmentOptions.push({
							value: variable.segmentName, label: () => {
								return {
									node: <IncorrectOptionLabel>
										{Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SEGMENT_INCORRECT_SELECTED}
									</IncorrectOptionLabel>, label: ''
								};
							}
						});
					}
				}
			}

			if (segmentOptions.length === 0) {
				segmentOptions.push({value: '', label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SEGMENT_NO_AVAILABLE});
			}
			return {buckets: bucketOptions, segments: segmentOptions};
		} else {
			// bucket not selected
			segmentOptions = [{value: '', label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SELECT_FIRST}];
		}
		if (bucketOptions.length === 0) {
			// no available buckets
			bucketOptions.push({value: '', label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_NO_AVAILABLE});
		}
		return {buckets: bucketOptions, segments: segmentOptions};
	})();

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

const Variable = (props: {
	objective: Objective;
	variable: ObjectiveVariable;
	index: number;
	onRemove: (variable: ObjectiveVariable) => void;
	buckets: Array<Bucket>;
}) => {
	const {objective, variable, index, onRemove, buckets} = props;

	const [editing, setEditing] = useState(false);
	const save = useSave();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		variable.name = value;
		save(objective);
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
			save(objective);
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
		<VariableValues objective={objective} variable={variable} buckets={buckets}/>
		<RemoveItemButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			<FontAwesomeIcon icon={ICON_DELETE}/>
		</RemoveItemButton>
	</VariableContainer>;
};

export const Variables = (props: { data: EditObjective }) => {
	const {data} = props;

	const [buckets] = useState<Array<Bucket>>([]);
	const save = useSave();

	if (data.objective.variables == null) {
		data.objective.variables = [];
	}

	const onRemove = (variable: ObjectiveVariable) => {
		data.objective.variables!.splice(data.objective.variables!.indexOf(variable), 1);
		save(data.objective);
	};
	const onAddClicked = () => {
		data.objective.variables!.push({kind: ObjectiveVariableKind.SINGLE_VALUE} as ObjectiveVariable);
		save(data.objective);
	};

	const variables = data.objective.variables;

	return <EditStep index={ObjectiveDeclarationStep.VARIABLES} title={Lang.INDICATOR.OBJECTIVE.VARIABLES_TITLE}>
		<VariablesContainer>
			{variables.map((variable, index) => {
				return <Variable objective={data.objective} variable={variable} index={index + 1}
				                 onRemove={onRemove}
				                 buckets={buckets}
				                 key={`${variable.name || ''}-${index}`}/>;
			})}
			<AddItemButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
				{Lang.INDICATOR.OBJECTIVE.ADD_VARIABLE}
			</AddItemButton>
		</VariablesContainer>
	</EditStep>;
};