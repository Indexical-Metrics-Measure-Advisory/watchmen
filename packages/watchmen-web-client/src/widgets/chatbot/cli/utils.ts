import {Command} from '../command';
import {MatchedCommand, MatchedCommands} from './types';

const findNextQuote = (text: string, quote: string, startPosition: number): number => {
	const index = text.indexOf(quote, startPosition);
	if (index === -1) {
		return index;
	} else if (text.substring(index - 1, 1) === '\\') {
		return findNextQuote(text, quote, index + 1);
	} else {
		return index;
	}
};
const matchFreeTextCommandUnderQuotes = (commandText: string, freeTextCommand: Command, quote: string): MatchedCommand => {
	const index = findNextQuote(commandText, quote, 1);
	if (index === -1) {
		// not a string quoted by given quote, free text not end, continue key in
		return {left: commandText};
		// return {command: {...freeTextCommand, command: commandText.trim()}, left: ''};
	} else {
		let realCommand = commandText.substring(0, index);
		if (realCommand.startsWith(quote)) {
			realCommand = realCommand.substring(1);
		}
		return {
			command: {...freeTextCommand, command: realCommand},
			left: commandText.substring(index + 1)
		};
	}
};
const matchFreeTextCommand = (commandText: string, startCommand: Command, greedy: boolean): MatchedCommand => {
	// only one free text command is defined, or not
	const freeTextCommand = startCommand.trails.find(cmd => cmd.command === '');
	if (freeTextCommand) {
		if (greedy) {
			// greedy then treat command text as command
			return {command: {...freeTextCommand, command: commandText.trim()}, left: ''};
		}
		// otherwise check quote
		if (commandText.startsWith('"')) {
			return matchFreeTextCommandUnderQuotes(commandText, freeTextCommand, '"');
		} else if (commandText.startsWith('\'')) {
			return matchFreeTextCommandUnderQuotes(commandText, freeTextCommand, '"');
		} else {
			// just let it be, continue key in
			// return {command: {...freeTextCommand, command: commandText.trim()}, left: ''};
			return {left: commandText};
		}
	} else {
		return {left: commandText};
	}
};
const findFirstCommand = (startCommand: Command, commandText: string, greedy: boolean): MatchedCommand => {
	const fixCommands = startCommand.trails.filter(cmd => cmd.command !== '');
	if (greedy) {
		// try to match each part
		let found = fixCommands.find(cmd => commandText === cmd.command);
		if (found) {
			return {command: found, left: ''};
		}
		found = fixCommands.find(cmd => commandText.startsWith(`${cmd.command} `));
		if (found) {
			return {
				command: found,
				left: found ? commandText.substring(found.command.length).trimStart() : commandText
			};
		}
		return matchFreeTextCommand(commandText, startCommand, greedy);
	} else {
		// each command must follow a blank
		const found = fixCommands.find(cmd => commandText.startsWith(`${cmd.command} `));
		if (found) {
			return {
				command: found,
				left: found ? commandText.substring(found.command.length).trimStart() : commandText
			};
		}
		if (commandText.endsWith(' ')) {
			// last character is a space, free text command is open to match
			return matchFreeTextCommand(commandText, startCommand, greedy);
		} else {
			// leave it as text
			return {left: commandText};
		}
	}
};
export const matchCommand = (options: {
	matched: MatchedCommands; startCommand: Command; commandText: string; greedy: boolean;
}) => {
	const {matched, startCommand, commandText, greedy} = options;

	let found = findFirstCommand(startCommand, commandText, greedy);
	if (found.command) {
		// command matched
		matched.commands.push(found.command);
		const leftText = found.left;
		if (leftText.trim().length !== 0 && found.command.trails.length !== 0) {
			// there is text left and matched command has trails
			matchCommand({matched, startCommand: found.command, commandText: leftText, greedy});
		} else if (leftText.trim().length === 0) {
			// no text left
			matched.left = '';
		} else if (found.command.trails.length === 0) {
			// matched command has no trail
			matched.left = leftText;
		}
	} else {
		// no command matched
		matched.left = found.left;
	}
};

export const matchCommandText = (options: {
	text: string; greedy: boolean; allCommands: Array<Command>; pickedCommands: Array<Command>;
}) => {
	const {text, greedy, allCommands, pickedCommands} = options;

	let startCommand: Command;
	if (text.trimStart().startsWith('/')) {
		startCommand = {trails: allCommands} as Command;
	} else if (pickedCommands.length === 0) {
		startCommand = {trails: allCommands} as Command;
	} else {
		startCommand = pickedCommands[pickedCommands.length - 1];
	}

	const matched: MatchedCommands = {commands: [], left: ''};
	if (text.trim()) {
		matchCommand({matched, startCommand, commandText: text.trimStart(), greedy});
	}
	return matched;
};