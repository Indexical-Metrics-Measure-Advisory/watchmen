import {
	AskRecommendationRenderer,
	ExecutionContent,
	NewSessionRenderer,
	NotedRenderer,
	PickOptionRenderer
} from '@/widgets/chatbot';

export const Execution = (props: { content: ExecutionContent }) => {
	const {content} = props;

	return <>
		<NewSessionRenderer content={content}/>
		<NotedRenderer content={content}/>
		<PickOptionRenderer content={content}/>
		<AskRecommendationRenderer content={content}/>
	</>;
};
