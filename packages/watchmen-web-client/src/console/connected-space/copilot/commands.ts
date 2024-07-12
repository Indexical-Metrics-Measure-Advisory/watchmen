import {Command, createHelpCmd, NewSessionCmd} from '@/widgets/chatbot';

export const CONNECTED_SPACE_COMMANDS: Array<Command> = [NewSessionCmd];
export const CONNECTED_SPACE_HELP_COMMAND = createHelpCmd([]);
