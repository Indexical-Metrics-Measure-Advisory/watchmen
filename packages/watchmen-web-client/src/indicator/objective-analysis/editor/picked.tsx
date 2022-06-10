import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent} from 'react';
import {useNavigatorVisible} from '../use-navigator-visible';
import {NameEditor} from './name-editor';
import {AnalysisDescriptor, AnalysisDescriptorWrapper, EditorBody, EditorContainer, EditorHeader, EditorHeaderButtons} from './widgets';

export const Picked = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const navigatorVisible = useNavigatorVisible();
	const forceUpdate = useForceUpdate();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		analysis.description = event.target.value;

		event.target.style.height = `calc(${event.target.value.split('\n').length} * var(--line-height) + 12px)`;
		// wait height changed
		setTimeout(() => {
			forceUpdate();
		}, 0);
	};

	return <EditorContainer>
		<EditorHeader navigatorVisible={navigatorVisible}>
			<NameEditor analysis={analysis}/>
			<EditorHeaderButtons>
				<Button ink={ButtonInk.DANGER}>{Lang.ACTIONS.DELETE}</Button>
			</EditorHeaderButtons>
		</EditorHeader>
		<EditorBody>
			<AnalysisDescriptorWrapper>
				<AnalysisDescriptor value={analysis.description ?? ''} onChange={onDescriptionChanged}
				                    placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_DESCRIPTION_PLACEHOLDER}/>
			</AnalysisDescriptorWrapper>
		</EditorBody>
	</EditorContainer>;
};
