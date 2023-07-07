import {Convergence, ConvergenceVariable} from '@/services/data/tuples/convergence-types';
import {isBucketVariable, isFreeWalkVariable, isTimeFrameVariable} from '@/services/data/tuples/convergence-utils';
import {isBlank, isNotBlank, noop} from '@/services/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {EditStep} from '../edit-step';
import {ConvergenceDeclarationStep} from '../steps';
import {AxisEditGrid} from './axis-edit-grid';
import {ObjectiveEditGrid} from './objective-edit-grid';

export const Def = (props: { convergence: Convergence }) => {
	const {convergence} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire, on, off} = useConvergencesEventBus();
	const [axisFrozen, setAxisFrozen] = useState(false);
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

	const unfreeze = () => {
		setAxisFrozen(false);
	};
	const freeze = () => {
		const couldFreeze = convergence.variables
			&& convergence.variables.length !== 0
			&& convergence.variables.every(variable => {
				if (isBlank(variable.name)) {
					return false;
				}
				if (isBucketVariable(variable)) {
					return isNotBlank(variable.bucketId);
				} else if (isTimeFrameVariable(variable)) {
					return isNotBlank(variable.till) && isNotBlank(variable.times) && variable.kind != null;
				} else if (isFreeWalkVariable(variable)) {
					return variable.values && variable.values.every(v => isNotBlank(v));
				} else {
					return true;
				}
			});
		if (!couldFreeze) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{Lang.INDICATOR.CONVERGENCE.VARIABLE_NOT_FILLED}
			</AlertLabel>);
		} else {
			setAxisFrozen(true);
		}
	};

	return <EditStep index={ConvergenceDeclarationStep.DEF} title={Lang.INDICATOR.CONVERGENCE.DEF_TITLE}
	                 data-step="def">
		{axisFrozen
			? <ObjectiveEditGrid convergence={convergence} unfreeze={unfreeze}/>
			: <AxisEditGrid convergence={convergence} freeze={freeze}/>}
	</EditStep>;
};