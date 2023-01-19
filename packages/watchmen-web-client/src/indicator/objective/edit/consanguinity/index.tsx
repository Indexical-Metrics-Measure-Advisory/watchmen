import {Consanguinity} from '@/services/data/tuples/consanguinity';
import {fetchConsanguinity} from '@/services/data/tuples/objective';
import {Objective} from '@/services/data/tuples/objective-types';
import {Button} from '@/widgets/basic/button';
import {ICON_LOADING} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {DialogFooter} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import {ConsanguinityDialogBody, Loading} from './widgets';

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
				<Loading>
					<FontAwesomeIcon icon={ICON_LOADING} spin={true}/>
					<span>{Lang.PLAIN.LOADING}</span>
				</Loading>
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