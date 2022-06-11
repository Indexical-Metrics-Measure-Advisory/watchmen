import {ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {useDescription} from './use-description';

export const PerspectiveOnAchievement = (props: { data: ObjectiveAnalysisPerspective }) => {
	const {data} = props;

	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(data);

	return <></>;
};