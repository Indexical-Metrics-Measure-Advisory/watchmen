import {XAxisFreeWalkVariable, YAxisFreeWalkVariable} from '@/indicator/convergence/edit/def/freewalk-variable';
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
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {EditStep} from '../edit-step';
import {ConvergenceDeclarationStep} from '../steps';
import {XAxisBucketVariable, YAxisBucketVariable} from './bucket-variable';
import {XAxisTimeframeVariable, YAxisTimeframeVariable} from './timeframe-variable';
import {DefGrid, LeadCorner, TargetsGrid, XAxis, YAxis} from './widgets';

export const Def = (props: { convergence: Convergence }) => {
	const {convergence} = props;

	const {fire, on, off} = useConvergencesEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onDeleteVariable = (from: Convergence, variable: ConvergenceVariable) => {
			if (from !== convergence) {
				return;
			}
			convergence.variables = (convergence.variables || []).filter(v => v !== variable);
			fire(ConvergencesEventTypes.SAVE_CONVERGENCE, convergence, noop);
			forceUpdate();
		};
		on(ConvergencesEventTypes.DELETE_VARIABLE, onDeleteVariable);
		return () => {
			off(ConvergencesEventTypes.DELETE_VARIABLE, onDeleteVariable);
		};
	}, [fire, on, off, forceUpdate, convergence]);

	const xVariables = (convergence.variables || []).filter(variable => variable.axis === ConvergenceVariableAxis.X);
	const yVariables = (convergence.variables || []).filter(variable => variable.axis === ConvergenceVariableAxis.Y);
	const xColumns = xVariables.length ?? 0;
	const yColumns = yVariables.length ?? 0;
	const addAxisOptions = [
		{value: ConvergenceVariableType.FREE_WALK, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_FREE_WALK},
		{value: ConvergenceVariableType.BUCKET, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_BUCKET},
		{value: ConvergenceVariableType.TIMEFRAME, label: Lang.INDICATOR.CONVERGENCE.VARIABLE_TYPE_TIMEFRAME}
	];
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

	return <EditStep index={ConvergenceDeclarationStep.DEF} title={Lang.INDICATOR.CONVERGENCE.DEF_TITLE}>
		<DefGrid yCount={yColumns + 1}>
			<LeadCorner yCount={yColumns + 1} xCount={xColumns + 1}/>
			{xVariables.map(variable => {
				if (isBucketVariable(variable)) {
					return <XAxisBucketVariable convergence={convergence} variable={variable}/>;
				} else if (isTimeFrameVariable(variable)) {
					return <XAxisTimeframeVariable convergence={convergence} variable={variable}/>;
				} else if (isFreeWalkVariable(variable)) {
					return <XAxisFreeWalkVariable convergence={convergence} variable={variable}/>;
				} else {
					return null;
				}
			})}
			<XAxis data-add="">
				<Dropdown options={addAxisOptions} value={null} onChange={onAxisAddChanged(ConvergenceVariableAxis.X)}
				          please={Lang.INDICATOR.CONVERGENCE.X_AXIS_ADD_PLACEHOLDER}/>
			</XAxis>
			{yVariables.map(variable => {
				if (isBucketVariable(variable)) {
					return <YAxisBucketVariable convergence={convergence} variable={variable}/>;
				} else if (isTimeFrameVariable(variable)) {
					return <YAxisTimeframeVariable convergence={convergence} variable={variable}/>;
				} else if (isFreeWalkVariable(variable)) {
					return <YAxisFreeWalkVariable convergence={convergence} variable={variable}/>;
				} else {
					return null;
				}
			})}
			<YAxis data-add="">
				<Dropdown options={addAxisOptions} value={null} onChange={onAxisAddChanged(ConvergenceVariableAxis.Y)}
				          please={Lang.INDICATOR.CONVERGENCE.Y_AXIS_ADD_PLACEHOLDER}/>
			</YAxis>
			<TargetsGrid>

			</TargetsGrid>
		</DefGrid>
	</EditStep>;
};