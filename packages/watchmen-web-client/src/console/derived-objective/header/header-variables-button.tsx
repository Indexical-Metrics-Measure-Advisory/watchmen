import {ICON_VARIABLES} from '@/widgets/basic/constants';
import {PageHeaderButton} from '@/widgets/basic/page-header-buttons';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useState} from 'react';
import styled from 'styled-components';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';

const VariableIcon = styled(FontAwesomeIcon)`
	transition : color 300ms ease-in-out;
	&[data-visible=true] {
		color : var(--warn-color);
	}
`;

export const HeaderVariablesButton = () => {
	const {fire} = useObjectiveEventBus();
	const [visible, setVisible] = useState(false);

	const onVisibleClicked = () => {
		setVisible(!visible);
		fire(ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, !visible);
	};

	const tooltip = visible ? Lang.CONSOLE.DERIVED_OBJECTIVE.HIDE_VARIABLES : Lang.CONSOLE.DERIVED_OBJECTIVE.SHOW_VARIABLES;

	return <PageHeaderButton tooltip={tooltip} onClick={onVisibleClicked}>
		<VariableIcon icon={ICON_VARIABLES} data-visible={visible}/>
	</PageHeaderButton>;
};