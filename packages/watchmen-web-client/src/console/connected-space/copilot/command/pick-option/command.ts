import {CopilotAnswerOption} from '@/services/copilot/types';
import {Command, CommandPublishedBehaviorType} from '@/widgets/chatbot';

export const CMD_PICK_OPTION = '/pick-option';

export interface PickOptionCommand extends Command, CopilotAnswerOption {
}

export const PickOptionCmd: Command = {
	label: 'Pick Option',
	command: CMD_PICK_OPTION,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createPickOptionCommand = (option: CopilotAnswerOption): PickOptionCommand => {
	return {...PickOptionCmd, ...option};
};