import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {ICON_CLEAR_SCREEN, ICON_HELP} from '../../basic/constants';
import {TooltipAlignment} from '../../basic/types';
import {Command} from '../command';
import {CliEventTypes, useCliEventBus} from './events';
import {CommandLineButton, CommandLineButtons} from './widgets';

export const CLITrailButtons = (props: { helpCommand?: Command }) => {
	const {helpCommand} = props;

	const {fire} = useCliEventBus();
	const onClearScreenClicked = () => fire(CliEventTypes.CLEAR_SCREEN);
	const onHelpClicked = () => {
		if (helpCommand == null) {
			return;
		}
		fire(CliEventTypes.EXECUTE_COMMAND, [helpCommand], '');
	};

	return <CommandLineButtons>
		<CommandLineButton tooltip={{alignment: TooltipAlignment.CENTER, label: 'Clear Screen'}}
		                   onClick={onClearScreenClicked}>
			<FontAwesomeIcon icon={ICON_CLEAR_SCREEN}/>
		</CommandLineButton>
		{helpCommand != null
			? <CommandLineButton tooltip={{alignment: TooltipAlignment.RIGHT, offsetX: 5, label: 'Help'}}
			                     onClick={onHelpClicked}>
				<FontAwesomeIcon icon={ICON_HELP}/>
			</CommandLineButton>
			: null}
	</CommandLineButtons>;
};