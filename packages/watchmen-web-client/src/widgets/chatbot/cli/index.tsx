import React, {FC, ReactNode} from 'react';
import {ClearCmd, Command} from '../command';
import {Greeting} from '../greeting';
import {CLITrailButtons} from './cli-trail-buttons';
import {CliEventBusProvider} from './events';
import {Executions} from './execution';
import {HintBar} from './hint-bar';
import {ExecutionContent} from './types';
import {CLIContainer, CommandArea, CommandLine, CommandLineSeparator, WorkingArea} from './widgets';
import {Workbench} from './workbench';

const CLI = (props: {
	greeting: string;
	commands: Array<Command>;
	helpCommand?: Command;
	executions: ((props: any) => ReactNode) | ReactNode
}) => {
	const {greeting, commands, helpCommand, executions} = props;

	const availableCommands = [...commands, ClearCmd, helpCommand].filter(x => x != null) as Array<Command>;

	return <CLIContainer>
		<WorkingArea>
			<>
				<Greeting>{greeting}</Greeting>
				{executions}
			</>
		</WorkingArea>
		<CommandArea>
			<CommandLine>
				<HintBar commands={availableCommands}/>
				<Workbench commands={availableCommands}/>
				<CommandLineSeparator/>
				<CLITrailButtons helpCommand={helpCommand}/>
			</CommandLine>
		</CommandArea>
	</CLIContainer>;
};

export const CLIWrapper = (props: {
	greeting: string;
	commands: Array<Command>;
	helpCommand?: Command;
	execution: ((props: { content: ExecutionContent }) => JSX.Element) | FC<{ content: ExecutionContent }>;
	children?: ReactNode;
}) => {
	const {greeting, commands, helpCommand, execution, children} = props;

	return <CliEventBusProvider>
		<CLI greeting={greeting} commands={commands} helpCommand={helpCommand}
		     executions={<Executions execution={execution}/>}/>
		{children}
	</CliEventBusProvider>;
};
export {matchCommand} from './utils';
export * from './types';
export * from './events/cli-event-bus-types';
export * from './events/cli-event-bus';
// export * from './widgets';
export * from './execution';
export * from './graph';
