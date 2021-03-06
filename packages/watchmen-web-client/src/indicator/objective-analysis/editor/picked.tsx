import {isAdmin} from '@/services/data/account';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {useNavigatorVisible} from '../use-navigator-visible';
import {HeaderButtons} from './buttons';
import {DescriptionEditor} from './description-editor';
import {NameEditor} from './name-editor';
import {Perspectives} from './perspectives';
import {ObjectiveAnalysisSaver} from './saver';
import {EditorBody, EditorContainer, EditorHeader} from './widgets';

export const Picked = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const navigatorVisible = useNavigatorVisible();
	const startOnView = !isAdmin();

	return <EditorContainer>
		<ObjectiveAnalysisSaver analysis={analysis}/>
		<EditorHeader navigatorVisible={navigatorVisible}>
			<NameEditor analysis={analysis}/>
			<HeaderButtons analysis={analysis} startOnView={startOnView}/>
		</EditorHeader>
		<EditorBody>
			<DescriptionEditor analysis={analysis}/>
			<Perspectives analysis={analysis} startOnView={startOnView}/>
		</EditorBody>
	</EditorContainer>;
};
