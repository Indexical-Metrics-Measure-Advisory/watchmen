import {ExecutionContent} from '../../../cli';
import {isFirstSessionContent, FirstSessionExecution} from './execution';

export * from './command';
export * from './execution';

export const FirstSessionRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isFirstSessionContent(content)) {
		return <FirstSessionExecution content={content}/>;
	} else {
		return null;
	}
};
