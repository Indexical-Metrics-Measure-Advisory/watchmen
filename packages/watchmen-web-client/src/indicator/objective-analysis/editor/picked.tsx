import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {useNavigatorVisible} from '../use-navigator-visible';
import {NameEditor} from './name-editor';
import {EditorContainer, EditorHeader, EditorHeaderButtons} from './widgets';

export const Picked = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const navigatorVisible = useNavigatorVisible();

	return <EditorContainer>
		<EditorHeader navigatorVisible={navigatorVisible}>
			<NameEditor analysis={analysis}/>
			<EditorHeaderButtons>
				<Button ink={ButtonInk.DANGER}>{Lang.ACTIONS.DELETE}</Button>
			</EditorHeaderButtons>
		</EditorHeader>
	</EditorContainer>;
};