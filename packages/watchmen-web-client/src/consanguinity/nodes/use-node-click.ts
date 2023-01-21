import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes} from '../consanguinity-event-bus-types';

export const useNodeClick = (cid: ConsanguinityUniqueId) => {
	const [selected, setSelected] = useState(false);
	const {on, off, fire} = useConsanguinityEventBus();
	useEffect(() => {
		const onNodeSelected = (id: ConsanguinityUniqueId) => {
			if (id !== cid) {
				setSelected(false);
			}
		};
		on(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		return () => {
			off(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		};
	}, [on, off, cid]);

	return {
		selected, onClick: () => {
			setSelected(true);
			fire(ConsanguinityEventTypes.NODE_SELECTED, cid);
		}
	};
};