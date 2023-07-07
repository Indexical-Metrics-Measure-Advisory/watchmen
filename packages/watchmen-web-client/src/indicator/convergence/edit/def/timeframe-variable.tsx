import {
	Convergence,
	ConvergenceTimeFrameVariable,
	ConvergenceTimeFrameVariableKind
} from '@/services/data/tuples/convergence-types';
import {getCurrentTime} from '@/services/data/utils';
import {noop} from '@/services/utils';
import {Calendar} from '@/widgets/basic/calendar';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {computeTimeFrameValues} from './utils';
import {XAxisLegendCell} from './xaxis-legend-cell';
import {YAxisLegendCell} from './yaxis-legend-cell';

const TimeframeVariable = (props: { convergence: Convergence; variable: ConvergenceTimeFrameVariable }) => {
	const {convergence, variable} = props;

	const {fire} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();

	const computeValues = () => {
		computeTimeFrameValues(variable);
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