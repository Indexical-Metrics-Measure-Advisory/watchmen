import {
	Convergence,
	ConvergenceTimeFrameVariable,
	ConvergenceTimeFrameVariableKind
} from '@/services/data/tuples/convergence-types';
import {formatTime, getCurrentTime} from '@/services/data/utils';
import {noop} from '@/services/utils';
import {Calendar} from '@/widgets/basic/calendar';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import dayjs, {Dayjs, ManipulateType} from 'dayjs';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {XAxisLegendCell} from './xaxis-legend-cell';
import {YAxisLegendCell} from './yaxis-legend-cell';

const computeRangeValues = (till: Dayjs, times: number) => (unit: ManipulateType, multiply: number = 1) => {
	return new Array(times).fill(1).map((_, index) => {
		return {
			start: formatTime(till.subtract((index + 1) * multiply, unit).add(1, 'day').hour(0).minute(0).second(0)),
			end: formatTime(till.subtract(index * multiply, unit).hour(23).minute(59).second(59))
		};
	}).reverse();
};

const TimeframeVariable = (props: { convergence: Convergence; variable: ConvergenceTimeFrameVariable }) => {
	const {convergence, variable} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const computeValues = () => {
		const times = isNaN(Number(variable.times)) ? 1 : Number(variable.times);
		const till = dayjs(variable.till || getCurrentTime().substring(0, 10));
		const compute = computeRangeValues(till, times);

		switch (variable.kind) {
			case ConvergenceTimeFrameVariableKind.DAY:
				variable.values = compute('day');
				break;
			case ConvergenceTimeFrameVariableKind.WEEK:
				variable.values = compute('week');
				break;
			case ConvergenceTimeFrameVariableKind.MONTH:
				variable.values = compute('month');
				break;
			case ConvergenceTimeFrameVariableKind.QUARTER:
				variable.values = compute('month', 3);
				break;
			case ConvergenceTimeFrameVariableKind.HALF_YEAR:
				variable.values = compute('month', 6);
				break;
			case ConvergenceTimeFrameVariableKind.YEAR:
				variable.values = compute('year');
				break;
		}
		fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
		forceUpdate();
	};
	const onKindChanged = (option: DropdownOption) => {
		variable.kind = option.value as ConvergenceTimeFrameVariableKind;
		computeValues();
	};
	const onTillChanged = (value?: string) => {
		variable.till = value ?? (void 0);
		if (variable.till?.includes(' ')) {
			variable.till = variable.till?.substring(0, variable.till?.indexOf(' '));
		}
		computeValues();
	};
	const onTimesChanged = (option: DropdownOption) => {
		variable.times = option.value as number;
		computeValues();
	};

	variable.kind = variable.kind ?? ConvergenceTimeFrameVariableKind.MONTH;
	variable.till = (variable.till || null) ?? getCurrentTime();
	if (variable.till?.includes(' ')) {
		variable.till = variable.till?.substring(0, variable.till?.indexOf(' '));
	}
	variable.times = (variable.times || null) ?? 12;

	const kindOptions = [
		{value: ConvergenceTimeFrameVariableKind.DAY, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_DAY},
		{value: ConvergenceTimeFrameVariableKind.WEEK, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_WEEK},
		{
			value: ConvergenceTimeFrameVariableKind.MONTH,
			label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_MONTH
		},
		{
			value: ConvergenceTimeFrameVariableKind.QUARTER,
			label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_QUARTER
		},
		{
			value: ConvergenceTimeFrameVariableKind.HALF_YEAR,
			label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_HALFYEAR
		},
		{value: ConvergenceTimeFrameVariableKind.YEAR, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND_YEAR}
	];
	const timesOptions = new Array(120).fill(1).map((_, index) => {
		return {value: index + 1, label: `${index + 1}`};
	});

	return <>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_KIND}</span>
		<Dropdown options={kindOptions} value={variable.kind} onChange={onKindChanged}/>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_TILL}</span>
		<Calendar value={variable.till} onChange={onTillChanged} showTime={false}/>
		<span>{Lang.INDICATOR.CONVERGENCE.VARIABLE_TIMEFRAME_TIMES}</span>
		<Dropdown options={timesOptions} value={variable.times} onChange={onTimesChanged}/>
	</>;
};

export const XAxisTimeframeVariable = (props: { convergence: Convergence; variable: ConvergenceTimeFrameVariable }) => {
	const {convergence, variable} = props;

	return <XAxisLegendCell convergence={convergence} variable={variable} columns={3}>
		<TimeframeVariable convergence={convergence} variable={variable}/>
	</XAxisLegendCell>;
};

export const YAxisTimeframeVariable = (props: { convergence: Convergence; variable: ConvergenceTimeFrameVariable }) => {
	const {convergence, variable} = props;

	return <YAxisLegendCell convergence={convergence} variable={variable}>
		<TimeframeVariable convergence={convergence} variable={variable}/>
	</YAxisLegendCell>;
};