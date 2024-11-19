import {
	CliEventTypes, Command,
	ExecutionCommandLineArgument,
	ExecutionCommandLinePrimary,
	ExecutionContent,
	ExecutionDelegate,
	ExecutionResultItemTable,
	ExecutionResultNoData,
	GraphDiagram,
	useCliEventBus
} from '@/widgets/chatbot';
import React, {useState} from 'react';
import {DQCCacheData} from '../../cache/types';
import {useDataQualityCacheData} from '../../cache/use-cache-data';
import {CMD_ARGUMENT_START, CMD_ARGUMENT_STOP, CMD_FLOW} from './commands';
import {compute} from './utils';

export const isFlowExecution = (content: ExecutionContent) => {
	const {commands} = content;
	return commands[0].command === CMD_FLOW;
};

export const FlowExecution = (props: { content: ExecutionContent }) => {
	const {content} = props;
	const {commands} = content;
	const [, ...args] = commands;

	const {fire} = useCliEventBus();
	const [result, setResult] = useState<any>();
	const [onDataRetrieved] = useState(() => {
		return (data?: DQCCacheData) => {
			if (data) {
				let starts: string | undefined;
				let stops: string | undefined;
				if (args[0]) {
					if (args[0].command === CMD_ARGUMENT_START) {
						starts = args[1]?.command.trim();
					} else if (args[0].command === CMD_ARGUMENT_STOP) {
						stops = args[1]?.command.trim();
					}
				}
				if (args[2]) {
					if (args[2].command === CMD_ARGUMENT_START) {
						starts = args[3]?.command.trim();
					} else if (args[2].command === CMD_ARGUMENT_STOP) {
						stops = args[3]?.command.trim();
					}
				}
				const options = compute({maps: data.maps, relations: data.relations, starts, stops});
				if (!options) {
					setResult(<ExecutionResultItemTable>
						<ExecutionResultNoData>No data flow found.</ExecutionResultNoData>
					</ExecutionResultItemTable>);
				} else {
					setResult(<GraphDiagram options={options}/>);
				}
			} else {
				setResult(<ExecutionResultItemTable>
					<ExecutionResultNoData>No data flow found.</ExecutionResultNoData>
				</ExecutionResultItemTable>);
			}
			fire(CliEventTypes.COMMAND_EXECUTED);
		};
	});
	useDataQualityCacheData({onDataRetrieved});

	return <ExecutionDelegate content={content}
	                          commandLine={<>
		                          <ExecutionCommandLinePrimary>/flow</ExecutionCommandLinePrimary>
		                          {args.map((argument: Command, index: number) => {
			                          if (index === 1 || index === 3) {
				                          return <ExecutionCommandLineArgument
					                          key={index}>"{argument.command}"</ExecutionCommandLineArgument>;
			                          } else {
				                          return <ExecutionCommandLineArgument
					                          key={index}>{argument.command}</ExecutionCommandLineArgument>;
			                          }
		                          })}
	                          </>}
	                          result={result}/>;
};