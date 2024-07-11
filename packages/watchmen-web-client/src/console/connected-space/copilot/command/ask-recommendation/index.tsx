import {ExecutionContent} from '@/widgets/chatbot';
import {isAskRecommendationContent, AskRecommendationExecution} from './execution';

export * from './command';
export * from './execution';

export const AskRecommendationRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isAskRecommendationContent(content)) {
		return <AskRecommendationExecution content={content}/>;
	} else {
		return null;
	}
};
