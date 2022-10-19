import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {ICON_OBJECTIVE_ANALYSIS} from '@/widgets/basic/constants';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useDescription} from './use-description';
import {AnalysisDescriptor, AnalysisDescriptorWrapper} from './widgets';

export const DescriptionEditor = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(analysis, analysis);

	return <AnalysisDescriptorWrapper>
		<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS}/>
		<AnalysisDescriptor value={analysis.description ?? ''}
		                    onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
		                    placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_DESCRIPTION_PLACEHOLDER}/>
	</AnalysisDescriptorWrapper>;
};