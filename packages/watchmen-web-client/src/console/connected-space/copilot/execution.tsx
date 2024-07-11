import {ExecutionContent} from '@/widgets/chatbot';
import {AskRecommendationRenderer, NewSessionRenderer, NotedRenderer, PickOptionRenderer} from './command';

export const Execution = (props: { content: ExecutionContent }) => {
	const {content} = props;

	return <>
		<NewSessionRenderer content={content}/>
		<NotedRenderer content={content}/>
		<PickOptionRenderer content={content}/>
		<AskRecommendationRenderer content={content}/>
	</>;
};
