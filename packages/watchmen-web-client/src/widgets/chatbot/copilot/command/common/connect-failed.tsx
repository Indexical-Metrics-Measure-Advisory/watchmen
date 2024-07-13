import {CopilotAnswer, CopilotAnswerItemType, CopilotAnswerOption} from '@/services/copilot/types';
import React, {ReactNode} from 'react';
// noinspection ES6PreferShortImport
import {Lang} from '../../../../langs';
import {CliEventTypes, useCliEventBus} from '../../../cli';
import {CopilotConstants} from '../../constants';
import {createYesCommand, NoCmd} from '../noted';
import {RetryCommand} from '../types';
import {Answer} from './answer';

export interface FailedToAnswerProps {
	greeting?: ReactNode;
	askRetryCommand: () => Promise<RetryCommand>;
}

export const ConnectFailed = (props: FailedToAnswerProps) => {
	const {greeting, askRetryCommand} = props;

	const {fire} = useCliEventBus();
	const handleOption = async (option: CopilotAnswerOption) => {
		const {token} = option;
		if (token === CopilotConstants.Yes) {
			fire(CliEventTypes.EXECUTE_COMMAND, [createYesCommand(askRetryCommand)]);
		} else {
			fire(CliEventTypes.EXECUTE_COMMAND, [NoCmd]);
		}
		return true;
	};
	const answer: CopilotAnswer = {
		data: [
			Lang.COPILOT.CONNECT_FAIL,
			{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.YES, token: CopilotConstants.Yes},
			' ',
			{type: CopilotAnswerItemType.OPTION, text: Lang.COPILOT.NO, token: CopilotConstants.No}
		]
	};
	return <Answer greeting={greeting} answer={answer} handleOption={handleOption}/>;
};
