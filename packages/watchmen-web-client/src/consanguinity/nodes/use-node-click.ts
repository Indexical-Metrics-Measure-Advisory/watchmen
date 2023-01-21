import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes} from '../consanguinity-event-bus-types';

export enum NodeActive {
	NONE = 'none',
	SELECTED = 'selected'
}

export const useNodeClick = (cid: ConsanguinityUniqueId) => {
	const [active, setActive] = useState(NodeActive.NONE);
	const {on, off, fire} = useConsanguinityEventBus();
	useEffect(() => {
		const onNodeSelected = (id: ConsanguinityUniqueId) => {
			if (id !== cid) {
				setActive(NodeActive.NONE);
			}
		};
		on(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		return () => {
			off(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		};
	}, [on, off, cid]);

	return {
		active, onClick: () => {
			setActive(NodeActive.SELECTED);
			fire(ConsanguinityEventTypes.NODE_SELECTED, cid);
		}
	};
};