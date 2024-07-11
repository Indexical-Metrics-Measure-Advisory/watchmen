import {Command} from '@/widgets/chatbot';

export interface TextReplyCommand extends Command {
	/** text user key-in */
	replyTo?: string;
}