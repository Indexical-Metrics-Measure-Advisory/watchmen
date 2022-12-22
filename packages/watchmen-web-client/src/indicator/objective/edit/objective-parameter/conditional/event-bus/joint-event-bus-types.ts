import {
	ObjectiveParameterCondition,
	ObjectiveParameterExpression,
	ObjectiveParameterJoint
} from '@/services/data/tuples/objective-types';

export enum JointEventTypes {
	JOINT_TYPE_CHANGED = 'joint-type-changed',

	SUB_EXPRESSION_ADDED = 'sub-expression-added',
	SUB_JOINT_ADDED = 'sub-joint-added',

	SUB_EXPRESSION_REMOVED = 'sub-expression-removed',
	SUB_JOINT_REMOVED = 'sub-joint-removed',

	EXPRESSION_CONTENT_CHANGED = 'expression-content-changed',

	EXPAND_CONTENT = 'expand-content',
	COLLAPSE_CONTENT = 'collapse-content'
}

export interface JointEventBus {
	fire(type: JointEventTypes.JOINT_TYPE_CHANGED, joint?: ObjectiveParameterJoint): this;
	on(type: JointEventTypes.JOINT_TYPE_CHANGED, listener: (joint?: ObjectiveParameterJoint) => void): this;
	off(type: JointEventTypes.JOINT_TYPE_CHANGED, listener: (joint?: ObjectiveParameterJoint) => void): this;

	fire(type: JointEventTypes.SUB_EXPRESSION_ADDED, expression: ObjectiveParameterExpression, parent: ObjectiveParameterJoint): this;
	on(type: JointEventTypes.SUB_EXPRESSION_ADDED, listener: (expression: ObjectiveParameterExpression, parent: ObjectiveParameterJoint) => void): this;
	off(type: JointEventTypes.SUB_EXPRESSION_ADDED, listener: (expression: ObjectiveParameterExpression, parent: ObjectiveParameterJoint) => void): this;

	fire(type: JointEventTypes.SUB_JOINT_ADDED, joint: ObjectiveParameterJoint, parent: ObjectiveParameterJoint): this;
	on(type: JointEventTypes.SUB_JOINT_ADDED, listener: (joint: ObjectiveParameterJoint, parent: ObjectiveParameterJoint) => void): this;
	off(type: JointEventTypes.SUB_JOINT_ADDED, listener: (joint: ObjectiveParameterJoint, parent: ObjectiveParameterJoint) => void): this;

	fire(type: JointEventTypes.SUB_EXPRESSION_REMOVED, expression: ObjectiveParameterExpression, parent: ObjectiveParameterJoint): this;
	on(type: JointEventTypes.SUB_EXPRESSION_REMOVED, listener: (expression: ObjectiveParameterExpression, parent: ObjectiveParameterJoint) => void): this;
	off(type: JointEventTypes.SUB_EXPRESSION_REMOVED, listener: (expression: ObjectiveParameterExpression, parent: ObjectiveParameterJoint) => void): this;

	fire(type: JointEventTypes.SUB_JOINT_REMOVED, joint: ObjectiveParameterJoint, parent: ObjectiveParameterJoint): this;
	on(type: JointEventTypes.SUB_JOINT_REMOVED, listener: (joint: ObjectiveParameterJoint, parent: ObjectiveParameterJoint) => void): this;
	off(type: JointEventTypes.SUB_JOINT_REMOVED, listener: (joint: ObjectiveParameterJoint, parent: ObjectiveParameterJoint) => void): this;

	fire(type: JointEventTypes.EXPRESSION_CONTENT_CHANGED, condition: ObjectiveParameterCondition, parent: ObjectiveParameterJoint): this;
	on(type: JointEventTypes.EXPRESSION_CONTENT_CHANGED, listener: (condition: ObjectiveParameterCondition, parent: ObjectiveParameterJoint) => void): this;
	off(type: JointEventTypes.EXPRESSION_CONTENT_CHANGED, listener: (condition: ObjectiveParameterCondition, parent: ObjectiveParameterJoint) => void): this;

	fire(type: JointEventTypes.EXPAND_CONTENT): this;
	on(type: JointEventTypes.EXPAND_CONTENT, listener: () => void): this;
	off(type: JointEventTypes.EXPAND_CONTENT, listener: () => void): this;

	fire(type: JointEventTypes.COLLAPSE_CONTENT): this;
	on(type: JointEventTypes.COLLAPSE_CONTENT, listener: () => void): this;
	off(type: JointEventTypes.COLLAPSE_CONTENT, listener: () => void): this;
}