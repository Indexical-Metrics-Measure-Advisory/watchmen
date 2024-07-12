import {Command} from '../../command';

export interface RetryCommand {
	commands: Array<Command>;
	argument?: string;
}
