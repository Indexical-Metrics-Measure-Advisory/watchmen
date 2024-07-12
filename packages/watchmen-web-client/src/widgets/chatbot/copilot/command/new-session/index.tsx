import {ExecutionContent} from '../../../cli';
import {isNewSessionContent, NewSessionExecution} from './execution';

export * from './command';
export * from './execution';

export const NewSessionRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isNewSessionContent(content)) {
		return <NewSessionExecution content={content}/>;
	} else {
		return null;
	}
};
