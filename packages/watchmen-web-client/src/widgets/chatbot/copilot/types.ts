import {Command} from '../command';

export interface TextReplyCommand extends Command {
	/** text user key-in */
	replyTo?: string;
}