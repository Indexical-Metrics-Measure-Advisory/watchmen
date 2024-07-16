import {CopilotAnswer, CopilotAnswerOption} from '@/services/copilot/types';
import React, {ReactNode, useEffect, useState} from 'react';
import {CliEventTypes, useCliEventBus} from '../../../cli';
import {ExecutionResultOfAnswer} from '../../answer';
import {FreeTextCmd} from '../free-text';
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
		// execute once anyway
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
};

export const Answer = (props: AnswerProps) => {
	const {greeting, answer, handleOption} = props;

	const {fire} = useCliEventBus();
	const [afterAnswer] = useState<AnswerProps['action']>(() => {
		return async () => {
			fire(CliEventTypes.SUGGEST_COMMAND, [FreeTextCmd]);
			if (props.action != null) {
				await props.action();
			} else {
				fire(CliEventTypes.COMMAND_EXECUTED);
			}
		};
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
