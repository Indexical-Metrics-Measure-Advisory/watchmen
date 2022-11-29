import {Objective, ObjectiveTarget, ObjectiveTargetBetterSide} from '@/services/data/tuples/objective-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {useSave} from './use-save';
import {AddTargetButton, ItemLabel, ItemNo, SetTargetAsIsButton, TargetContainer, TargetsContainer} from './widgets';

const Target = (props: { objective: Objective; target: ObjectiveTarget; index: number; }) => {
	const {objective, target, index} = props;

	const save = useSave();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		target.name = value;
		save(objective);
	};
	const onToBeChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		target.tobe = value;
		save(objective);
	};
	const onSetAsIsClicked = () => {
		// TODO
	};
	const onBetterSideChanged = (option: DropdownOption) => {
		target.betterSide = option.key as ObjectiveTargetBetterSide;
		save(objective);
	};
	const onAskPreviousCycleChanged = (value: boolean) => {
		target.askPreviousCycle = value;
		save(objective);
	};
	const onAskChainCycleChanged = (value: boolean) => {
		target.askChainCycle = value;
		save(objective);
	};

	const betterSideOptions = [
		{value: ObjectiveTargetBetterSide.MORE, label: Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE_MORE},
		{value: ObjectiveTargetBetterSide.LESS, label: Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE_LESS}
	];

	return <TargetContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_NAME}</ItemLabel>
		<Input value={target.name || ''} onChange={onNameChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_TOBE}</ItemLabel>
		<Input value={target.tobe || ''} onChange={onToBeChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_TOBE_PLACEHOLDER}</ItemLabel>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASIS}</ItemLabel>
		<SetTargetAsIsButton ink={ButtonInk.PRIMARY} onClick={onSetAsIsClicked}>
			{Lang.INDICATOR.OBJECTIVE.TARGET_ASIS_SET}
		</SetTargetAsIsButton>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE}</ItemLabel>
		<Dropdown value={target.betterSide || ObjectiveTargetBetterSide.MORE} options={betterSideOptions}
		          onChange={onBetterSideChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASK_PREVIOUS_CYCLE}</ItemLabel>
		<CheckBox value={target.askPreviousCycle || false} onChange={onAskPreviousCycleChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASK_CHAIN_CYCLE}</ItemLabel>
		<CheckBox value={target.askChainCycle || false} onChange={onAskChainCycleChanged}/>
	</TargetContainer>;
};

export const Targets = (props: { data: EditObjective }) => {
	const {data} = props;

	const save = useSave();

	if (data.objective.targets == null) {
		data.objective.targets = [];
	}

	const onAddClicked = () => {
		data.objective.targets!.push({} as ObjectiveTarget);
		save(data.objective);
	};

	const targets = data.objective.targets;

	return <EditStep index={ObjectiveDeclarationStep.TARGETS} title={Lang.INDICATOR.OBJECTIVE.TARGETS_TITLE}
	                 backToList={true}>
		<TargetsContainer>
			{targets.map((target, index) => {
				return <Target objective={data.objective} target={target} index={index + 1}
				               key={`${target.name || ''}-${index}`}/>;
			})}
			<AddTargetButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
				{Lang.INDICATOR.OBJECTIVE.ADD_TARGET}
			</AddTargetButton>
		</TargetsContainer>
	</EditStep>;
};
