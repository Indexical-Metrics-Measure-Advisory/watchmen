import {ObjectiveTarget, ObjectiveTargetBetterSide} from '@/services/data/tuples/objective-types';
import {CheckBox} from '@/widgets/basic/checkbox';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {AddTargetButton, ItemLabel, ItemNo, SetTargetAsIsButton, TargetContainer, TargetsContainer} from './widgets';

const Target = (props: { data: ObjectiveTarget; index: number; }) => {
	const {data, index} = props;

	const forceUpdate = useForceUpdate();

	const onNameChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		data.name = value;
		forceUpdate();
	};
	const onToBeChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		data.tobe = value;
		forceUpdate();
	};
	const onSetAsIsClicked = () => {
	};
	const onBetterSideChanged = (option: DropdownOption) => {
		data.betterSide = option.key as ObjectiveTargetBetterSide;
		forceUpdate();
	};
	const onAskPreviousCycleChanged = (value: boolean) => {
		data.askPreviousCycle = value;
		forceUpdate();
	};
	const onAskChainCycleChanged = (value: boolean) => {
		data.askChainCycle = value;
		forceUpdate();
	};

	const betterSideOptions = [
		{value: ObjectiveTargetBetterSide.MORE, label: Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE_MORE},
		{value: ObjectiveTargetBetterSide.LESS, label: Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE_LESS}
	];

	return <TargetContainer>
		<ItemNo>{index === -1 ? '' : `#${index}`}</ItemNo>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_NAME}</ItemLabel>
		<Input value={data.name || ''} onChange={onNameChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_TOBE}</ItemLabel>
		<Input value={data.tobe || ''} onChange={onToBeChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_TOBE_PLACEHOLDER}</ItemLabel>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASIS}</ItemLabel>
		<SetTargetAsIsButton ink={ButtonInk.PRIMARY} onClick={onSetAsIsClicked}>
			{Lang.INDICATOR.OBJECTIVE.TARGET_ASIS_SET}
		</SetTargetAsIsButton>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_BETTER_SIDE}</ItemLabel>
		<Dropdown value={data.betterSide || ObjectiveTargetBetterSide.MORE} options={betterSideOptions}
		          onChange={onBetterSideChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASK_PREVIOUS_CYCLE}</ItemLabel>
		<CheckBox value={data.askPreviousCycle || false} onChange={onAskPreviousCycleChanged}/>
		<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TARGET_ASK_CHAIN_CYCLE}</ItemLabel>
		<CheckBox value={data.askChainCycle || false} onChange={onAskChainCycleChanged}/>
	</TargetContainer>;
};

export const Targets = (props: { data: EditObjective }) => {
	const {data} = props;

	const forceUpdate = useForceUpdate();

	if (data.objective.targets == null) {
		data.objective.targets = [];
	}

	const onAddClicked = () => {
		data.objective.targets!.push({} as ObjectiveTarget);
		forceUpdate();
	};

	const targets = data.objective.targets;

	return <EditStep index={ObjectiveDeclarationStep.TARGETS} title={Lang.INDICATOR.OBJECTIVE.TARGETS_TITLE}
	                 backToList={true}>
		<TargetsContainer>
			{targets.map((target, index) => {
				return <Target data={target} index={index + 1} key={`${target.name || ''}-${index}`}/>;
			})}
			<AddTargetButton ink={ButtonInk.PRIMARY} onClick={onAddClicked}>
				{Lang.INDICATOR.OBJECTIVE.ADD_TARGET}
			</AddTargetButton>
		</TargetsContainer>
	</EditStep>;
};
