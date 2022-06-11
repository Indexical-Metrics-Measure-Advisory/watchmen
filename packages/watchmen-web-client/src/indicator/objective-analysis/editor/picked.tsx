import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {ChangeEvent, FocusEvent} from 'react';
import {useNavigatorVisible} from '../use-navigator-visible';
import {NameEditor} from './name-editor';
import {
	AnalysisDescriptor,
	AnalysisDescriptorWrapper,
	EditorBody,
	EditorContainer,
	EditorHeader,
	EditorHeaderButtons
} from './widgets';

const countLines = (text: string): number => {
	const count = text.split('\n').length;
	return count === 0 ? 1 : count;
};
export const Picked = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const navigatorVisible = useNavigatorVisible();
	const forceUpdate = useForceUpdate();

	const onDescriptionChanged = (event: ChangeEvent<HTMLTextAreaElement>) => {
		analysis.description = event.target.value;

		event.target.style.height = `calc(${countLines(event.target.value)} * var(--line-height) + 12px)`;
		// wait height changed
		setTimeout(() => {
			forceUpdate();
		}, 0);
	};
	const onDescriptionBlurred = (event: FocusEvent<HTMLTextAreaElement>) => {
		const lines = (analysis.description || '').split('\n').reverse();
		while (lines.length > 0 && lines[0].trim().length === 0) {
			lines.shift();
		}
		analysis.description = lines.reverse().join('\n');
		event.target.style.height = `calc(${countLines(analysis.description)} * var(--line-height) + 12px)`;
		forceUpdate();
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
				<AnalysisDescriptor value={analysis.description ?? ''}
				                    onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
				                    placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_DESCRIPTION_PLACEHOLDER}/>
			</AnalysisDescriptorWrapper>
		</EditorBody>
	</EditorContainer>;
};
