import {FC} from 'react';
import {ExecutionContent} from '../cli';
import {
	AskRecommendationRenderer,
	FirstSessionRenderer, FreeTextRenderer,
	NotedRenderer,
	PickOptionRenderer,
	RestartSessionRenderer
} from './command';

export interface CopilotExecutionProps {
	content: ExecutionContent;
}

export const createExecutionRenderer = (Renderer?: FC<CopilotExecutionProps>) => {
	return (props: CopilotExecutionProps) => {
		const {content} = props;

		return <>
			<FirstSessionRenderer content={content}/>
			<RestartSessionRenderer content={content}/>
			<NotedRenderer content={content}/>
			<PickOptionRenderer content={content}/>
			<AskRecommendationRenderer content={content}/>
			<FreeTextRenderer content={content}/>
			{Renderer != null ? <Renderer content={content}/> : null}
		</>;
	};
};

export const createCopilotExecution = (renderer?: FC<CopilotExecutionProps>): FC<CopilotExecutionProps> => {
	return createExecutionRenderer(renderer);
};