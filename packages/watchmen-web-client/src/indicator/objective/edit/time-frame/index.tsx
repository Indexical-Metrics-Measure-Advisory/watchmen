import {Objective, ObjectiveTimeFrameKind, ObjectiveTimeFrameTill} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Calendar} from '@/widgets/basic/calendar';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {buildKindOptions, buildLastNOptions, buildTillOptions} from '@/widgets/objective/options-utils';
import {
	computeChainFrame,
	computeFrame,
	computePreviousFrame,
	guardKind,
	guardTimeFrame,
	lastN,
	renderTimeFrame
} from '@/widgets/objective/time-frame-utils';
import React from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {ItemLabel, ItemValue} from '../widgets';
import {TimeFrameContainer} from './widgets';

export const TimeFrame = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useObjectivesEventBus();
	const forceUpdate = useForceUpdate();

	const def = guardTimeFrame(objective);

	const onKindChanged = (option: DropdownOption) => {
		def.kind = option.value as ObjectiveTimeFrameKind;
		guardTimeFrame(objective);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onLastNChanged = (option: DropdownOption) => {
		def.lastN = option.value as string;
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onTillChanged = (option: DropdownOption) => {
		def.till = option.value as ObjectiveTimeFrameTill;
		guardTimeFrame(objective);
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};
	const onSpecifiedTillChanged = (value?: string) => {
		if (value?.includes(' ')) {
			value = value?.substring(0, value?.indexOf(' '));
		}
		def.specifiedTill = value ?? '';
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
		forceUpdate();
	};

	const kindOptions = buildKindOptions();
	const tillOptions = buildTillOptions();
	const lastNOptions = buildLastNOptions(def);

	const isTimeRelated = def.kind !== ObjectiveTimeFrameKind.NONE;
	const isLastNKind = lastN(guardKind(def.kind));
	const isTillSpecified = def.till === ObjectiveTimeFrameTill.SPECIFIED;

	const currentFrame = computeFrame(def);
	const previousFrame = computePreviousFrame(def, currentFrame);
	const chainFrame = computeChainFrame(def, currentFrame);

	return <EditStep index={ObjectiveDeclarationStep.TIME_FRAME} title={Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TITLE}>
		<TimeFrameContainer timeRelated={isTimeRelated} lastN={isLastNKind} specifiedTill={isTillSpecified}>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND}</ItemLabel>
			<Dropdown value={def.kind || ObjectiveTimeFrameTill.NOW} options={kindOptions}
			          onChange={onKindChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_N_IS}</ItemLabel>
			<Dropdown value={def.lastN || ''} options={lastNOptions} onChange={onLastNChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL}</ItemLabel>
			<Dropdown value={def.till || ObjectiveTimeFrameTill.NOW} options={tillOptions}
			          onChange={onTillChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT}</ItemLabel>
			<Calendar value={def.specifiedTill} onChange={onSpecifiedTillChanged} showTime={false}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT_DESC}</ItemLabel>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CALCULATED}</ItemLabel>
			<ItemValue>{renderTimeFrame(currentFrame)}</ItemValue>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_PREVIOUS_CYCLE}</ItemLabel>
			<ItemValue>{renderTimeFrame(previousFrame)}</ItemValue>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CHAIN_CYCLE}</ItemLabel>
			<ItemValue>{renderTimeFrame(chainFrame)}</ItemValue>
		</TimeFrameContainer>
	</EditStep>;
};