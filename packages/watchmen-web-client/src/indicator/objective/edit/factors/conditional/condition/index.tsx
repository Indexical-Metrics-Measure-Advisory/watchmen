import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveParameterCondition
} from '@/services/data/tuples/objective-types';
import {isExpressionParameter, isJointParameter} from '../../../param-utils';
import {ExpressionEventBusProvider} from '../event-bus/expression-event-bus';
import {JointEventBusProvider} from '../event-bus/joint-event-bus';
import {Expression} from '../expression';
import {Joint} from '../joint';
import {Expression2ParentBridge} from './expression-2-parent-bridge';
import {Joint2ParentBridge} from './joint-2-parent-bridge';

export const Condition = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	condition: ObjectiveParameterCondition; removeMe: () => void; onChange: () => void;
}) => {
	const {objective, factor, indicator, condition, removeMe, onChange} = props;

	if (isJointParameter(condition)) {
		return <JointEventBusProvider>
			<Joint2ParentBridge onChange={onChange}/>
			<Joint objective={objective} factor={factor} indicator={indicator}
			       joint={condition} removeMe={removeMe}/>
		</JointEventBusProvider>;
	} else if (isExpressionParameter(condition)) {
		return <ExpressionEventBusProvider>
			<Expression2ParentBridge onChange={onChange}/>
			<Expression objective={objective} factor={factor} indicator={indicator}
			            expression={condition} removeMe={removeMe}/>
		</ExpressionEventBusProvider>;
	} else {
		return null;
	}
};