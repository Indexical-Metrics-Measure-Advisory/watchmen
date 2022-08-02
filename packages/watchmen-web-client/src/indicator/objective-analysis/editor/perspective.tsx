import {
	ObjectiveAnalysis,
	ObjectiveAnalysisPerspective,
	ObjectiveAnalysisPerspectiveType
} from '@/services/data/tuples/objective-analysis-types';
import {PerspectiveOnAchievement} from './achievement/perspective-on-achievement';
import {PerspectiveOnInspection} from './inspection/perspective-on-inspection';

export const Perspective = (props: {
	analysis: ObjectiveAnalysis;
	perspective: ObjectiveAnalysisPerspective;
	startOnView: boolean;
}) => {
	const {analysis, perspective, startOnView} = props;

	if (perspective.type === ObjectiveAnalysisPerspectiveType.INSPECTION) {
		return <PerspectiveOnInspection analysis={analysis} perspective={perspective} startOnView={startOnView}/>;
	} else if (perspective.type === ObjectiveAnalysisPerspectiveType.ACHIEVEMENT) {
		return <PerspectiveOnAchievement analysis={analysis} perspective={perspective} startOnView={startOnView}/>;
	}

	return null;
};