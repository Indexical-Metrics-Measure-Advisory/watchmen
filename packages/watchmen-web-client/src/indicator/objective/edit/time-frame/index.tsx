import {Objective, ObjectiveTimeFrameKind, ObjectiveTimeFrameTill} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Calendar} from '@/widgets/basic/calendar';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';
import {EditStep} from '../edit-step';
import {ObjectiveDeclarationStep} from '../steps';
import {ItemLabel, ItemValue} from '../widgets';
import {
	computeChainFrame,
	computeFrame,
	computePreviousFrame,
	guardKind,
	guardTimeFrame,
	lastN,
	renderTimeFrame
} from './utils';
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

	const kindOptions = [
		{value: ObjectiveTimeFrameKind.NONE, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_NONE},
		{value: ObjectiveTimeFrameKind.YEAR, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_YEAR},
		{value: ObjectiveTimeFrameKind.HALF_YEAR, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_HALF_YEAR},
		{value: ObjectiveTimeFrameKind.QUARTER, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_QUARTER},
		{value: ObjectiveTimeFrameKind.MONTH, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_MONTH},
		{value: ObjectiveTimeFrameKind.WEEK_OF_YEAR, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_WEEK_OF_YEAR},
		{value: ObjectiveTimeFrameKind.DAY_OF_MONTH, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_DAY_OF_MONTH},
		{value: ObjectiveTimeFrameKind.DAY_OF_WEEK, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_DAY_OF_WEEK},
		{value: ObjectiveTimeFrameKind.LAST_N_YEARS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_YEARS},
		{value: ObjectiveTimeFrameKind.LAST_N_MONTHS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_MONTHS},
		{value: ObjectiveTimeFrameKind.LAST_N_WEEKS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_WEEKS},
		{value: ObjectiveTimeFrameKind.LAST_N_DAYS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_DAYS}
	];
	const tillOptions = [
		{value: ObjectiveTimeFrameTill.NOW, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_NOW},
		{
			value: ObjectiveTimeFrameTill.LAST_COMPLETE_CYCLE,
			label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_LAST_COMPLETE_CYCLE
		},
		{value: ObjectiveTimeFrameTill.SPECIFIED, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED}
	];
	const lastNOptions = (() => {
		const buildOptions = (count: number): Array<DropdownOption> => {
			return new Array(count).fill(1).map((_, index) => {
				return {value: `${index + 1}`, label: `${index + 1}`};
			});
		};
		switch (def.kind) {
			case ObjectiveTimeFrameKind.LAST_N_YEARS:
				return buildOptions(10);
			case ObjectiveTimeFrameKind.LAST_N_MONTHS:
				return buildOptions(60);
			case ObjectiveTimeFrameKind.LAST_N_WEEKS:
				return buildOptions(54);
			case ObjectiveTimeFrameKind.LAST_N_DAYS:
				return buildOptions(366);
			default:
				return [] as Array<DropdownOption>;
		}
	})();

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