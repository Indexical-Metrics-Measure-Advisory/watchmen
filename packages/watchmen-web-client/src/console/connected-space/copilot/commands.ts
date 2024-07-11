import {Command, createHelpCmd} from '@/widgets/chatbot';
import {NewSessionCmd} from './command';

export const CONNECTED_SPACE_COMMANDS: Array<Command> = [NewSessionCmd];
export const CONNECTED_SPACE_HELP_COMMAND = createHelpCmd([]);
