import {CopilotAnswerOption, CopilotTextWithOptionsAnswer} from '@/services/copilot/types';
import React, {isValidElement} from 'react';
import {ExecutionResultItemLink, ExecutionResultItemText, ExecutionResultSegment} from '../cli/execution';

export interface ExecutionResultOfTextWithOptionsProps {
	answer: CopilotTextWithOptionsAnswer;
	click: (token: string) => Promise<void>;
}

export const ExecutionResultOfTextWithOptions = (props: ExecutionResultOfTextWithOptionsProps) => {
	const {answer: {text}, click} = props;

	const onLinkClicked = (token: string) => async () => await click(token);
	let useVertical = false;

	return <ExecutionResultSegment>
		{text.map((item, index) => {
			if (typeof item === 'string' || isValidElement(item)) {
				useVertical = false;
				return <ExecutionResultItemText key={`${item}-${index}`}>{item}</ExecutionResultItemText>;
			} else {
				const {text, token, vertical} = item as CopilotAnswerOption;
				useVertical = useVertical || (vertical ?? false);
				return <ExecutionResultItemLink vertical={useVertical} onClick={onLinkClicked(token)}
				                                key={`${token}-${index}`}>
					{text}
				</ExecutionResultItemLink>;
			}
		})}
	</ExecutionResultSegment>;
};
