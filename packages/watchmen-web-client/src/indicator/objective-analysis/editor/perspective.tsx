import {
	ObjectiveAnalysis,
	ObjectiveAnalysisPerspective,
	ObjectiveAnalysisPerspectiveType
} from '@/services/data/tuples/objective-analysis-types';
import {PerspectiveOnAchievement} from './achievement/perspective-on-achievement';
import {PerspectiveOnInspection} from './inspection/perspective-on-inspection';

export const Perspective = (props: { analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective }) => {
	const {analysis, perspective} = props;

	if (perspective.type === ObjectiveAnalysisPerspectiveType.INSPECTION) {
		return <PerspectiveOnInspection analysis={analysis} perspective={perspective}/>;
	} else if (perspective.type === ObjectiveAnalysisPerspectiveType.ACHIEVEMENT) {
		return <PerspectiveOnAchievement analysis={analysis} perspective={perspective}/>;
	}

	return null;
};