import {ExecutionContent, HelpExecution, isHelpExecution} from '@/widgets/chatbot';

export const Execution = (props: { content: ExecutionContent }) => {
	const {content} = props;

	return <>
		{isHelpExecution(content) ? <HelpExecution content={content}/> : null}
	</>;
};