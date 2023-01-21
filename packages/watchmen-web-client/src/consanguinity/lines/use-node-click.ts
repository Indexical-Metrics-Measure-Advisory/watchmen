import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes, RouteConsanguinityUniqueIds} from '../consanguinity-event-bus-types';

export enum LineActiveStatus {
	NONE = 'none',
	SELECTED = 'selected',
	DIRECT = 'direct',
	SAME_ROUTE = 'same-route'
}

export const useNodeClick = (fromCid: ConsanguinityUniqueId, toCid: ConsanguinityUniqueId) => {
	const [active, setActive] = useState<LineActiveStatus>(LineActiveStatus.NONE);
	const {on, off} = useConsanguinityEventBus();
	useEffect(() => {
		const onActiveSameRoute = (cids: RouteConsanguinityUniqueIds) => {
			const {center, direct, sameRoute} = cids;
			if (center === toCid) {
				// direct with center
				setActive(LineActiveStatus.SELECTED);
			} else if (direct.includes(toCid)) {
				setActive(LineActiveStatus.SAME_ROUTE);
			} else if (sameRoute.includes(fromCid) && sameRoute.includes(toCid)) {
				setActive(LineActiveStatus.SAME_ROUTE);
			} else {
				setActive(LineActiveStatus.NONE);
			}
		};
		on(ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, onActiveSameRoute);
		return () => {
			off(ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, onActiveSameRoute);
		};
	}, [on, off, fromCid, toCid]);
	return {active};
};