import {ExecutionContent} from '../../../cli';
import {isNoContent, isNotedContent, NoExecution, NotedExecution} from './execution';

export * from './command';
export * from './execution';

export const NotedRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isNotedContent(content)) {
		return <NotedExecution content={content}/>;
	} else if (isNoContent(content)) {
		return <NoExecution content={content}/>;
	} else {
		return null;
	}
};
