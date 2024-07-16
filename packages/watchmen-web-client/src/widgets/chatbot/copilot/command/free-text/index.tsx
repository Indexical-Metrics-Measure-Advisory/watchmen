import {ExecutionContent} from '../../../cli';
import {FreeTextExecution, isFreeTextContent} from './execution';

export * from './command';
export * from './execution';

export const FreeTextRenderer = (props: { content: ExecutionContent }) => {
	const {content} = props;

	if (isFreeTextContent(content)) {
		return <FreeTextExecution content={content}/>;
	} else {
		return null;
	}
};
