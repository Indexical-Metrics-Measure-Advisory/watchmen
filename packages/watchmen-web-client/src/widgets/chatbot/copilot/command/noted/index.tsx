import {ExecutionContent} from '../../../cli';
import {isNoContent, isNotedContent, isYesContent, NoExecution, NotedExecution, YesExecution} from './execution';

export * from './command';
export * from './execution';

export const NotedRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isNotedContent(content)) {
		return <NotedExecution content={content}/>;
	} else if (isNoContent(content)) {
		return <NoExecution content={content}/>;
	} else if (isYesContent(content)) {
		return <YesExecution content={content}/>;
	} else {
		return null;
	}
};
