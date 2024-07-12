import {ExecutionContent} from '../../../cli';
import {AskRecommendationExecution, isAskRecommendationContent} from './execution';

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
