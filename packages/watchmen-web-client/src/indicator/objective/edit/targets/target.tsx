import {Objective, ObjectiveTarget, ObjectiveTargetBetterSide} from '@/services/data/tuples/objective-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useSave} from '../use-save';
import {ItemLabel, ItemNo, RemoveItemButton} from '../widgets';
import {SetTargetAsIsButton, TargetContainer} from './widgets';

export const Target = (props: {
	objective: Objective;
	target: ObjectiveTarget;
	index: number;
	onRemove: (target: ObjectiveTarget) => void;
}) => {
	const {objective, target, index, onRemove} = props;

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
	const onRemoveClicked = () => onRemove(target);

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
		<RemoveItemButton ink={ButtonInk.DANGER} onClick={onRemoveClicked}>
			{Lang.INDICATOR.OBJECTIVE.REMOVE_TARGET}
		</RemoveItemButton>
	</TargetContainer>;
};