import {ObjectiveAnalysis, ObjectiveAnalysisPerspectiveType} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ICON_OBJECTIVE_ANALYSIS} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useNavigatorVisible} from '../use-navigator-visible';
import {NameEditor} from './name-editor';
import {Perspective} from './perspective';
import {useDescription} from './use-description';
import {
	AnalysisDescriptor,
	AnalysisDescriptorWrapper,
	EditorBody,
	EditorContainer,
	EditorHeader,
	EditorHeaderButtons
} from './widgets';

export const Picked = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const navigatorVisible = useNavigatorVisible();
	const forceUpdate = useForceUpdate();
	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(analysis);

	const onAddInspectionClicked = () => {
		analysis.perspectives = analysis.perspectives ?? [];
		analysis.perspectives.push({
			perspectiveId: generateUuid(),
			type: ObjectiveAnalysisPerspectiveType.INSPECTION
		});
		forceUpdate();
	};

	return <EditorContainer>
		<EditorHeader navigatorVisible={navigatorVisible}>
			<NameEditor analysis={analysis}/>
			<EditorHeaderButtons>
				<RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onAddInspectionClicked}>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_INSPECTION}
				</RoundDwarfButton>
				<RoundDwarfButton ink={ButtonInk.PRIMARY}>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_ACHIEVEMENT}
				</RoundDwarfButton>
				<RoundDwarfButton ink={ButtonInk.DANGER}>
					{Lang.ACTIONS.DELETE}
				</RoundDwarfButton>
			</EditorHeaderButtons>
		</EditorHeader>
		<EditorBody>
			<AnalysisDescriptorWrapper>
				<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS}/>
				<AnalysisDescriptor value={analysis.description ?? ''}
				                    onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
				                    placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_DESCRIPTION_PLACEHOLDER}/>
			</AnalysisDescriptorWrapper>
			{(analysis.perspectives || []).map(perspective => {
				return <Perspective data={perspective} key={perspective.perspectiveId}/>;
			})}
		</EditorBody>
	</EditorContainer>;
};
