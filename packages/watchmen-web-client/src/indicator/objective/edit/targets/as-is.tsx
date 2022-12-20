import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactorId,
	ObjectiveFormulaOperator,
	ObjectiveParameterType,
	ObjectiveTarget
} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {ComputedEditor} from '../parameter/compute';
import {FactorEditor} from '../parameter/factor';
import {ParameterEventBusProvider, useParameterEventBus} from '../parameter/parameter-event-bus';
import {ParameterEventTypes} from '../parameter/parameter-event-bus-types';
import {createFactorParameter} from '../parameter/utils';
import {AsIsContainer, AsIsTypeButton, AsIsTypeContainer, AsIsTypeIcon} from './widgets';

const isReferIndicator = (target: ObjectiveTarget): boolean => {
	return target.asis == null || typeof target.asis === 'string';
};

const useFactors = (objective: Objective, onParamChanged?: () => void) => {
	const {on: onObjective, off: offObjective, fire: fireObjective} = useObjectivesEventBus();
	const {on, off} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onChanged = () => {
			onParamChanged && onParamChanged();
			fireObjective(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		};
		on(ParameterEventTypes.PARAM_CHANGED, onChanged);
		return () => {
			off(ParameterEventTypes.PARAM_CHANGED, onChanged);
		};
	}, [on, off, fireObjective, objective, onParamChanged]);
	useEffect(() => {
		const onFactorChanged = () => forceUpdate();
		onObjective(ObjectivesEventTypes.FACTOR_ADDED, onFactorChanged);
		onObjective(ObjectivesEventTypes.FACTOR_REMOVED, onFactorChanged);
		return () => {
			offObjective(ObjectivesEventTypes.FACTOR_ADDED, onFactorChanged);
			offObjective(ObjectivesEventTypes.FACTOR_REMOVED, onFactorChanged);
		};
	}, [onObjective, offObjective, forceUpdate]);

	return objective.factors || [];
};

const ReferEditor = (props: { objective: Objective; target: ObjectiveTarget; }) => {
	// noinspection DuplicatedCode
	const {objective, target} = props;

	const parameter = {kind: ObjectiveParameterType.REFER, uuid: target.asis as ObjectiveFactorId};
	const factors = useFactors(objective, () => {
		target.asis = parameter.uuid;
	});

	return <FactorEditor objective={objective} parameter={parameter} factors={factors}/>;
};

const FormulaEditor = (props: { objective: Objective; target: ObjectiveTarget }) => {
	// noinspection DuplicatedCode
	const {objective, target} = props;

	const factors = useFactors(objective);

	return <ComputedEditor objective={objective} parameter={target.asis! as ComputedObjectiveParameter}
	                       factors={factors} hasAsIs={false}/>;
};

enum AsIsType {
	REFER = 'refer',
	COMPUTED = 'computed'
}

const useAsIsType = (objective: Objective, target: ObjectiveTarget) => {
	const {fire} = useObjectivesEventBus();
	const [editing, setEditing] = useState(false);

	const onStartEditing = () => setEditing(true);
	const onBlur = () => setEditing(false);
	const onTypeChanged = (from: AsIsType) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (from === AsIsType.REFER) {
			if (target.asis == null || typeof target.asis === 'string') {
				// do nothing, discard or start editing
				setEditing(!editing);
			} else {
				delete target.asis;
				setEditing(false);
				fire(ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, objective, target);
				fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
			}
		} else {
			if (target.asis != null && typeof target.asis === 'object') {
				// do nothing, discard or start editing
				setEditing(!editing);
			} else {
				target.asis = {
					kind: ObjectiveParameterType.COMPUTED,
					operator: ObjectiveFormulaOperator.ADD,
					parameters: [createFactorParameter(), createFactorParameter()]
				};
				setEditing(false);
				fire(ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, objective, target);
				fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
			}
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setEditing(!editing);
	};

	return {onTypeChanged, onIconClicked, onStartEditing, onBlur, editing};
};
export const AsIsTypeEditor = (props: { objective: Objective; target: ObjectiveTarget }) => {
	const {objective, target} = props;

	const {onTypeChanged, onIconClicked, onStartEditing, onBlur, editing} = useAsIsType(objective, target);

	const [current, candidate] = isReferIndicator(target)
		? [AsIsType.REFER, AsIsType.COMPUTED]
		: [AsIsType.COMPUTED, AsIsType.REFER];

	const OptionsLabel = {
		[AsIsType.REFER]: Lang.INDICATOR.OBJECTIVE.TARGET_ASIS_REFER,
		[AsIsType.COMPUTED]: Lang.INDICATOR.OBJECTIVE.TARGET_ASIS_COMPUTED
	};

	return <AsIsTypeContainer onClick={onStartEditing} tabIndex={0} onBlur={onBlur}>
		<AsIsTypeButton active={true} edit={editing} onClick={onTypeChanged(current)}>
			{OptionsLabel[current]}
		</AsIsTypeButton>
		<AsIsTypeButton active={false} edit={editing} onClick={onTypeChanged(candidate)}>
			{OptionsLabel[candidate]}
		</AsIsTypeButton>
		<AsIsTypeIcon onClick={onIconClicked} data-expanded={editing}>
			{editing ? <FontAwesomeIcon icon={ICON_COLLAPSE_CONTENT}/> : <FontAwesomeIcon icon={ICON_EDIT}/>}
		</AsIsTypeIcon>
	</AsIsTypeContainer>;
};

export const AsIsEditor = (props: { objective: Objective; target: ObjectiveTarget }) => {
	const {objective, target} = props;

	const {on, off} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onTargetAsIsTypeChanged = (_: Objective, t: ObjectiveTarget) => {
			if (t !== target) {
				return;
			}
			forceUpdate();
		};
		on(ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, onTargetAsIsTypeChanged);
		return () => {
			off(ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, onTargetAsIsTypeChanged);
		};
	}, [on, off, forceUpdate, target]);

	if (isReferIndicator(target)) {
		return <ParameterEventBusProvider>
			<ReferEditor objective={objective} target={target}/>
		</ParameterEventBusProvider>;
	} else {
		return <ParameterEventBusProvider>
			<FormulaEditor objective={objective} target={target}/>
		</ParameterEventBusProvider>;
	}
};

export const AsIs = (props: { objective: Objective; target: ObjectiveTarget }) => {
	const {objective, target} = props;

	return <AsIsContainer>
		<AsIsTypeEditor objective={objective} target={target}/>
		<AsIsEditor objective={objective} target={target}/>
	</AsIsContainer>;
};
