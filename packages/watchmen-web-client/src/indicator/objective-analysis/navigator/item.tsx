import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {ICON_OBJECTIVE_ANALYSIS_ITEM} from '@/widgets/basic/constants';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {ObjectiveAnalysisItem} from './widgets';

export const Item = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const {fire} = useObjectiveAnalysisEventBus();

	const onItemClick = () => {
		fire(ObjectiveAnalysisEventTypes.START_EDIT, analysis);
	};

	return <ObjectiveAnalysisItem key={analysis.analysisId} onClick={onItemClick}>
		<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS_ITEM}/>
		<span>{analysis.title}</span>
	</ObjectiveAnalysisItem>;
};