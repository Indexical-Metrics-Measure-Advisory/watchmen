import {ExecutionContent} from '@/widgets/chatbot';
import {NewSessionRenderer} from './command';

export const Execution = (props: { content: ExecutionContent }) => {
	const {content} = props;

	return <>
		<NewSessionRenderer content={content}/>
	</>;
};
