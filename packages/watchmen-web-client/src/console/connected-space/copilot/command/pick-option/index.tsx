import {ExecutionContent} from '@/widgets/chatbot';
import {isPickOptionContent, PickOptionExecution} from './execution';

export * from './command';
export * from './execution';

export const PickOptionRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isPickOptionContent(content)) {
		return <PickOptionExecution content={content}/>;
	} else {
		return null;
	}
};
