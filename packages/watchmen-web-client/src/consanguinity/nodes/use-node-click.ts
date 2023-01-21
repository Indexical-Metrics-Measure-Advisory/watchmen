import {ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {generateUuid} from '@/services/data/tuples/utils';
import {useEffect, useState} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes, RouteConsanguinityUniqueIds} from '../consanguinity-event-bus-types';

export enum NodeActiveStatus {
	NONE = 'none',
	SELECTED = 'selected',
	DIRECT = 'direct',
	SAME_ROUTE = 'same-route'
}

export const useNodeClick = (cid: ConsanguinityUniqueId) => {
	const [active, setActive] = useState<NodeActiveStatus>(NodeActiveStatus.NONE);
	const {on, off, fire} = useConsanguinityEventBus();
	useEffect(() => {
		const onActiveSameRoute = (cids: RouteConsanguinityUniqueIds) => {
			const {center, direct, sameRoute} = cids;
			if (center === cid) {
				setActive(NodeActiveStatus.SELECTED);
			} else if (direct.includes(cid)) {
				setActive(NodeActiveStatus.DIRECT);
			} else if (sameRoute.includes(cid)) {
				setActive(NodeActiveStatus.SAME_ROUTE);
			} else {
				setActive(NodeActiveStatus.NONE);
			}
		};
		on(ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, onActiveSameRoute);
		return () => {
			off(ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, onActiveSameRoute);
		};
	}, [on, off, cid]);

	return {
		active, onClick: () => {
			const eventId = generateUuid();
			fire(ConsanguinityEventTypes.NODE_SELECTED, cid, eventId);
		}
	};
};