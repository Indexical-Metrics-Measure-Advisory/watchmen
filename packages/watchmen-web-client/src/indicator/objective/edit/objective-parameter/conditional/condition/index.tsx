import {Objective, ObjectiveFactor, ObjectiveParameterCondition} from '@/services/data/tuples/objective-types';
import {isExpressionParameter, isJointParameter} from '../../../param-utils';
import {ExpressionEventBusProvider} from '../event-bus/expression-event-bus';
import {JointEventBusProvider} from '../event-bus/joint-event-bus';
import {Expression} from '../expression';
import {Joint} from '../joint';
import {Expression2ParentBridge} from './expression-2-parent-bridge';
import {Joint2ParentBridge} from './joint-2-parent-bridge';

export const Condition = (props: {
	objective: Objective;
	condition: ObjectiveParameterCondition; removeMe: () => void; onChange: () => void;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, condition, removeMe, onChange, factors} = props;

	if (isJointParameter(condition)) {
		return <JointEventBusProvider>
			<Joint2ParentBridge onChange={onChange}/>
			<Joint objective={objective} joint={condition} removeMe={removeMe} factors={factors}/>
		</JointEventBusProvider>;
	} else if (isExpressionParameter(condition)) {
		return <ExpressionEventBusProvider>
			<Expression2ParentBridge onChange={onChange}/>
			<Expression objective={objective} expression={condition} removeMe={removeMe} factors={factors}/>
		</ExpressionEventBusProvider>;
	} else {
		return null;
	}
};