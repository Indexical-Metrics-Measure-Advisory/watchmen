import {ParameterJoint} from '@/services/data/tuples/factor-calculator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {JointEdit} from './joint-filter/joint-edit';

export const SingleTopicFilter = (props: {
	topic: Topic;
	parentJoint?: ParameterJoint;
	onRemoveMe?: () => void;
	joint: ParameterJoint;
}) => {
	return <JointEdit {...props}/>;
};
