import {ExecutionContent} from '../../../cli';
import {isNotedContent, NotedExecution} from './execution';

export * from './command';
export * from './execution';

export const NotedRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isNotedContent(content)) {
		return <NotedExecution content={content}/>;
	} else {
		return null;
	}
};
