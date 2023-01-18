import {Consanguinity} from '@/services/data/tuples/consanguinity';
import {fetchConsanguinity} from '@/services/data/tuples/objective';
import {Objective} from '@/services/data/tuples/objective-types';
import {Button} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {DialogBody, DialogFooter} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useState} from 'react';
import styled from 'styled-components';

const ConsanguinityDialogBody = styled(DialogBody)`
	display               : grid;
	grid-template-columns : 1fr;
	grid-template-rows    : auto auto 1fr auto auto auto;
	margin-bottom         : var(--margin);
`;

interface State {
	loaded: boolean;
	data?: Consanguinity;
}

export const ObjectiveConsanguinityDiagram = (props: { objective: Objective }) => {
	const {objective} = props;

	const {fire} = useEventBus();
	const [state, setState] = useState<State>({loaded: false});
	useEffect(() => {
		if (state.loaded) {
			return;
		}
		fire(EventTypes.INVOKE_REMOTE_REQUEST,
			async () => fetchConsanguinity(objective),
			(consanguinity: Consanguinity) => setState({loaded: true, data: consanguinity}));
	}, [fire, state.loaded, objective]);

	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	if (!state.loaded) {
		return <>
			<ConsanguinityDialogBody>

			</ConsanguinityDialogBody>
			<DialogFooter>
				<Button ink={ButtonInk.WAIVE} onClick={onCloseClicked}>Close</Button>
			</DialogFooter>
		</>;
	}

	return <>
		<ConsanguinityDialogBody>

		</ConsanguinityDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.WAIVE} onClick={onCloseClicked}>Close</Button>
		</DialogFooter>
	</>;
};