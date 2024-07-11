import {CopilotAnswer, CopilotAnswerOption} from '@/services/copilot/types';
import {CliEventTypes, ExecutionResultOfAnswer, useCliEventBus} from '@/widgets/chatbot';
import React, {ReactNode, useEffect, useState} from 'react';

export interface AnswerProps {
	greeting?: ReactNode;
	answer: CopilotAnswer;
	action?: () => Promise<void>;
	handleOption?: (option: CopilotAnswerOption) => Promise<boolean>;
}

const useAnswered = (action: () => Promise<void>) => {
	useEffect(() => {
		(async () => await action())();
	}, [action]);
};

export const Answer = (props: AnswerProps) => {
	const {greeting, answer, handleOption} = props;

	const {fire} = useCliEventBus();
	const [afterAnswer] = useState<AnswerProps['action']>(() => {
		return props.action ?? (async () => {
			fire(CliEventTypes.COMMAND_EXECUTED);
		});
	});
	useAnswered(afterAnswer!);
	const onClick = async (option: CopilotAnswerOption) => {
		let handled = false;
		if (handleOption != null) {
			handled = await handleOption(option);
		}
		if (!handled) {
			// TODO DEFAULT HANDLE OPTION LOGIC
		}
	};

	return <>
		{greeting}
		<ExecutionResultOfAnswer answer={answer} onOptionPicked={onClick}/>
	</>;
};
