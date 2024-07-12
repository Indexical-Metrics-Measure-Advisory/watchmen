import {ExecutionContent} from '../../../cli';
import {isRestartSessionContent, RestartSessionExecution} from './execution';

export * from './command';
export * from './execution';

export const RestartSessionRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isRestartSessionContent(content)) {
		return <RestartSessionExecution content={content}/>;
	} else {
		return null;
	}
};
