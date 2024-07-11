import {NotedCmd} from '@/console/connected-space/copilot/command';
import {Answer} from '@/console/connected-space/copilot/command/common/answer';
import {CopilotAnswer, CopilotAnswerItemType, CopilotAnswerOption} from '@/services/copilot/types';
import {CliEventTypes, CopilotConstants, useCliEventBus} from '@/widgets/chatbot';
import {Lang} from '@/widgets/langs';
import React, {ReactNode} from 'react';

export interface FailedToAnswerProps {
	greeting?: ReactNode;
	retry: () => Promise<void>;
}

export const ConnectFailed = (props: FailedToAnswerProps) => {
	const {greeting, retry} = props;

	const {fire} = useCliEventBus();
	const handleOption = async (option: CopilotAnswerOption) => {
		const {token} = option;
		if (token === CopilotConstants.Yes) {
			await retry();
		} else {
			fire(CliEventTypes.EXECUTE_COMMAND, [NotedCmd]);
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
