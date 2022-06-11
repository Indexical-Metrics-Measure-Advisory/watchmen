import {
	ObjectiveAnalysisPerspective,
	ObjectiveAnalysisPerspectiveType
} from '@/services/data/tuples/objective-analysis-types';
import {PerspectiveOnAchievement} from './perspective-on-achievement';
import {PerspectiveOnInspection} from './perspective-on-inspection';

export const Perspective = (props: { data: ObjectiveAnalysisPerspective }) => {
	const {data} = props;

	if (data.type === ObjectiveAnalysisPerspectiveType.INSPECTION) {
		return <PerspectiveOnInspection data={data}/>;
	} else if (data.type === ObjectiveAnalysisPerspectiveType.ACHIEVEMENT) {
		return <PerspectiveOnAchievement data={data}/>;
	}

	return null;
};