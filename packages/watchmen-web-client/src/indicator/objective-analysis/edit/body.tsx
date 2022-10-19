import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {DescriptionEditor} from './description-editor';
import {Perspectives} from './perspectives';
import {EditorBody, EditorContainer} from './widgets';

export const Body = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	return <EditorContainer>
		<EditorBody>
			<DescriptionEditor analysis={analysis}/>
			<Perspectives analysis={analysis} startOnView={false}/>
		</EditorBody>
	</EditorContainer>;
};
