import {CopilotAnswer, CopilotAnswerOption} from '@/services/copilot/types';
import React, {ReactNode, useEffect, useState} from 'react';
import {CliEventTypes, useCliEventBus} from '../../../cli';
import {ExecutionResultOfAnswer} from '../../answer';
import {createPickOptionCommand} from '../pick-option';

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
	const onOptionPicked = async (option: CopilotAnswerOption) => {
		let handled = false;
		if (handleOption != null) {
			handled = await handleOption(option);
		}
		if (!handled) {
			fire(CliEventTypes.EXECUTE_COMMAND, [createPickOptionCommand(option)]);
		}
	};

	return <>
		{greeting}
		<ExecutionResultOfAnswer answer={answer} onOptionPicked={onOptionPicked}/>
	</>;
};
