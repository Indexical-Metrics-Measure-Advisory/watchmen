import {CopilotAnswerOption} from '@/services/copilot/types';
import {Command, CommandPublishedBehaviorType} from '../../../command';

export const CMD_PICK_OPTION = '/pick option';

export interface PickOptionCommand extends Command {
	option: CopilotAnswerOption;
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
	return {...PickOptionCmd, option};
};

export const CMD_DO_PICK_OPTION = '/do pick option';

export interface DoPickOptionCommand extends Command {
	option: CopilotAnswerOption;
}

export const DoPickOptionCmd: Command = {
	label: 'Do Pick Option',
	command: CMD_DO_PICK_OPTION,
	reminder: '',
	published: {type: CommandPublishedBehaviorType.CLEAR_ALL},
	trails: [],
	executableOnNoTrail: true
};

export const createDoPickOptionCommand = (option: CopilotAnswerOption): DoPickOptionCommand => {
	return {...DoPickOptionCmd, option};
};
