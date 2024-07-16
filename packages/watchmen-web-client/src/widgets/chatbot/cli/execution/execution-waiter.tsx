import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useRef, useState} from 'react';
import {ICON_CMD_PROMPT} from '../../../basic/constants';
import {CliEventTypes, useCliEventBus} from '../events';
import {ExecutionCommandLine, ExecutionContainer, ExecutionPrompt, ExecutionPromptFlicker} from './widgets';

export const ExecutionWaiter = () => {
	const {on, off} = useCliEventBus();
	// noinspection TypeScriptValidateTypes
	const ref = useRef<HTMLDivElement>(null);
	const [executing, setExecuting] = useState(false);
	useEffect(() => {
		const onExecuteCommand = () => {
			console.log('execute command');
			ref.current?.scrollIntoView({behavior: 'smooth'});
			setExecuting(true);
		};
		on(CliEventTypes.EXECUTE_COMMAND, onExecuteCommand);
		return () => {
			off(CliEventTypes.EXECUTE_COMMAND, onExecuteCommand);
		};
	}, [on, off]);
	useEffect(() => {
		const onCommandExecuted = () => {
			console.log('command executed');
			ref.current?.scrollIntoView({behavior: 'smooth'});
			setExecuting(false);
		};
		on(CliEventTypes.COMMAND_EXECUTED, onCommandExecuted);
		return () => {
			off(CliEventTypes.COMMAND_EXECUTED, onCommandExecuted);
		};
	}, [on, off]);

	if (executing) {
		return <ExecutionContainer ref={ref}/>;
	} else {
		return <ExecutionContainer ref={ref}>
			<ExecutionPrompt>
				<FontAwesomeIcon icon={ICON_CMD_PROMPT}/>
			</ExecutionPrompt>
			<ExecutionCommandLine>
				<ExecutionPromptFlicker/>
			</ExecutionCommandLine>
		</ExecutionContainer>;
	}
};
