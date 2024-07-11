import {CopilotAnswer, CopilotAnswerItemType, CopilotAnswerOption} from '@/services/copilot/types';
import React, {isValidElement} from 'react';
import {ExecutionResultItemLink, ExecutionResultItemText, ExecutionResultSegment} from '../cli/execution';

export interface ExecutionResultOfAnswerProps {
	answer: CopilotAnswer;
	onOptionPicked: (option: CopilotAnswerOption) => Promise<void>;
}

export const ExecutionResultOfAnswer = (props: ExecutionResultOfAnswerProps) => {
	const {answer: {data}, onOptionPicked} = props;

	const onLinkClicked = (option: CopilotAnswerOption) => async () => await onOptionPicked(option);
	let useVertical = false;

	return <ExecutionResultSegment>
		{data.map((item, index) => {
			if (typeof item === 'string' || isValidElement(item)) {
				useVertical = false;
				return <ExecutionResultItemText key={`${item}-${index}`}>{item}</ExecutionResultItemText>;
			} else if (item.type === CopilotAnswerItemType.OPTION) {
				const {text, token, vertical} = item as CopilotAnswerOption;
				useVertical = useVertical || (vertical ?? false);
				return <ExecutionResultItemLink vertical={useVertical}
				                                onClick={onLinkClicked(item as CopilotAnswerOption)}
				                                key={`${token}-${index}`}>
					{text}
				</ExecutionResultItemLink>;
			} else {
				return <ExecutionResultItemText key={`${item}-${index}`}>
					[{item.type}] not supported yet.
				</ExecutionResultItemText>;
			}
		})}
	</ExecutionResultSegment>;
};
