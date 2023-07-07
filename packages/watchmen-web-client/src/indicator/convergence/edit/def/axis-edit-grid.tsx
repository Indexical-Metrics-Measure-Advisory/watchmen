import {
	Convergence,
	ConvergenceFreeWalkVariable,
	ConvergenceTimeFrameVariable,
	ConvergenceTimeFrameVariableKind,
	ConvergenceVariable,
	ConvergenceVariableAxis,
	ConvergenceVariableType
} from '@/services/data/tuples/convergence-types';
import {isBucketVariable, isFreeWalkVariable, isTimeFrameVariable} from '@/services/data/tuples/convergence-utils';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {XAxisBucketVariable, YAxisBucketVariable} from './bucket-variable';
import {XAxisFreeWalkVariable, YAxisFreeWalkVariable} from './freewalk-variable';
import {XAxisTimeframeVariable, YAxisTimeframeVariable} from './timeframe-variable';
import {AxisEditGridContainer, FreezeButton, LeadCorner, TargetsGrid, XAxis, YAxis} from './widgets';

export const AxisEditGrid = (props: { convergence: Convergence, freeze: () => void }) => {
	const {convergence, freeze} = props;

	const forceUpdate = useForceUpdate();

	const xVariables = (convergence.variables || []).filter(variable => variable.axis === ConvergenceVariableAxis.X);
	const xRowsCount = xVariables.length ?? 0;
	const yVariables = (convergence.variables || []).filter(variable => variable.axis === ConvergenceVariableAxis.Y);
	const yColumnsCount = yVariables.length ?? 0;

	const onAxisAddChanged = (axis: ConvergenceVariableAxis) => (option: DropdownOption) => {
		const type = option.value as ConvergenceVariableType;
		const variable = {uuid: generateUuid(), type, axis} as ConvergenceVariable;
		switch (type) {
			case ConvergenceVariableType.FREE_WALK:
				(variable as ConvergenceFreeWalkVariable).values = [];
				break;
			case ConvergenceVariableType.TIMEFRAME:
				(variable as ConvergenceTimeFrameVariable).kind = ConvergenceTimeFrameVariableKind.MONTH;
				(variable as ConvergenceTimeFrameVariable).till = getCurrentTime();
				break;
		}
		if (convergence.variables == null) {
			convergence.variables = [];
		}
		convergence.variables.push(variable);
		forceUpdate();
	};
	const onFreezeClicked = () => freeze();

	// only one free walk and one time frame
	const xAxisOptions = [
		xVariables.some(variable => isFreeWalkVariable(variable))
			? null
			: {value: ConvergenceVariableType.FREE_WALK, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_FREE_WALK},
		{value: ConvergenceVariableType.BUCKET, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_BUCKET},
		xVariables.some(variable => isTimeFrameVariable(variable))
			? null
			: {value: ConvergenceVariableType.TIMEFRAME, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_TIMEFRAME}
	].filter(x => x != null) as Array<DropdownOption>;
	const yAxisOptions = [
		yVariables.some(variable => isFreeWalkVariable(variable))
			? null
			: {value: ConvergenceVariableType.FREE_WALK, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_FREE_WALK},
		{value: ConvergenceVariableType.BUCKET, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_BUCKET},
		yVariables.some(variable => isTimeFrameVariable(variable))
			? null
			: {value: ConvergenceVariableType.TIMEFRAME, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_TIMEFRAME}
	].filter(x => x != null) as Array<DropdownOption>;

	return <AxisEditGridContainer yCount={yColumnsCount + 1} xCount={xRowsCount + 1}>
		<LeadCorner yCount={yColumnsCount + 1} xCount={xRowsCount + 1}/>
		{xVariables.map((variable) => {
			if (isBucketVariable(variable)) {
				return <XAxisBucketVariable convergence={convergence} variable={variable} key={variable.uuid}/>;
			} else if (isTimeFrameVariable(variable)) {
				return <XAxisTimeframeVariable convergence={convergence} variable={variable} key={variable.uuid}/>;
			} else if (isFreeWalkVariable(variable)) {
				return <XAxisFreeWalkVariable convergence={convergence} variable={variable} key={variable.uuid}/>;
			} else {
				return null;
			}
		})}
		<XAxis data-add="">
			<Dropdown options={xAxisOptions} value={null}
			          onChange={onAxisAddChanged(ConvergenceVariableAxis.X)}
			          please={Lang.INDICATOR.CONVERGENCE.X_AXIS_ADD_PLACEHOLDER}/>
		</XAxis>
		{yVariables.map((variable) => {
			if (isBucketVariable(variable)) {
				return <YAxisBucketVariable convergence={convergence} variable={variable} key={variable.uuid}/>;
			} else if (isTimeFrameVariable(variable)) {
				return <YAxisTimeframeVariable convergence={convergence} variable={variable} key={variable.uuid}/>;
			} else if (isFreeWalkVariable(variable)) {
				return <YAxisFreeWalkVariable convergence={convergence} variable={variable} key={variable.uuid}/>;
			} else {
				return null;
			}
		})}
		<YAxis data-add="">
			<Dropdown options={yAxisOptions} value={null}
			          onChange={onAxisAddChanged(ConvergenceVariableAxis.Y)}
			          please={Lang.INDICATOR.CONVERGENCE.Y_AXIS_ADD_PLACEHOLDER}/>
		</YAxis>
		<TargetsGrid>
			<FreezeButton onClick={onFreezeClicked}>{Lang.INDICATOR.CONVERGENCE.FREEZE_DEF}</FreezeButton>
		</TargetsGrid>
	</AxisEditGridContainer>;
};