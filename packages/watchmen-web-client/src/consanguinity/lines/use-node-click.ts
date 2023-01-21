import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes} from '../consanguinity-event-bus-types';

export const useNodeClick = (fromCid: ConsanguinityUniqueId, toCid: ConsanguinityUniqueId) => {
	const {on, off} = useConsanguinityEventBus();
	const [active, setActive] = useState(false);
	useEffect(() => {
		const onNodeSelected = (cid: ConsanguinityUniqueId) => {
			setActive(cid === fromCid || cid === toCid);
		};
		on(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		return () => {
			off(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		};
	}, [on, off, fromCid, toCid]);
	return {active};
};