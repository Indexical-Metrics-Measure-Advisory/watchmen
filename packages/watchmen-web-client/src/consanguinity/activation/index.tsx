import {Consanguinity, ConsanguinityUniqueId} from '@/services/data/tuples/consanguinity';
import {useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect} from 'react';
// noinspection ES6PreferShortImport
import {useConsanguinityEventBus} from '../consanguinity-event-bus';
// noinspection ES6PreferShortImport
import {ConsanguinityEventTypes} from '../consanguinity-event-bus-types';
import {DiagramDataMap, DiagramRelation} from '../types';

const buildDirectIdsFinder = (consanguinity: Consanguinity, relations: Array<DiagramRelation>): ((cids: Array<ConsanguinityUniqueId>, from: boolean) => Array<ConsanguinityUniqueId>) => {
	const relationMap = relations.reduce((map, relation) => {
		const {from, to} = relation;
		if (map[from] == null) {
			map[from] = {from: [], to: []};
		}
		if (!map[from].to.includes(to)) {
			map[from].to.push(to);
		}
		if (map[to] == null) {
			map[to] = {from: [], to: []};
		}
		if (!map[to].from.includes(from)) {
			map[to].from.push(from);
		}
		return map;
	}, {} as Record<ConsanguinityUniqueId, { from: Array<ConsanguinityUniqueId>, to: Array<ConsanguinityUniqueId> }>);
	return (cids: Array<ConsanguinityUniqueId>, from: boolean): Array<ConsanguinityUniqueId> => {
		return cids.map(cid => relationMap[cid])
			.filter(directIds => directIds != null)
			.reduce((all, directIds) => {
				(from ? directIds.from : directIds.to).forEach(cid => {
					if (!all.map[cid]) {
						all.list.push(cid);
					}
				});
				return all;
			}, {
				list: [] as Array<ConsanguinityUniqueId>,
				map: {} as Record<ConsanguinityUniqueId, boolean>
			}).list;
	};
};

export const ConsanguinityActivation = (props: {
	consanguinity: Consanguinity;
	relations: Array<DiagramRelation>;
	maps: DiagramDataMap;
}) => {
	const {consanguinity, relations} = props;

	const {on, off, fire} = useConsanguinityEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [consanguinity, saveQueue]);
	useEffect(() => {
		const onNodeSelected = (cid: ConsanguinityUniqueId) => {
			saveQueue.replace(() => {
				const findRelevantIds = buildDirectIdsFinder(consanguinity, relations);
				const found = [true].map(direction => {
					// direct
					const directIds = findRelevantIds([cid], direction).filter(found => found !== cid);
					const sameRouteCidMap: Record<ConsanguinityUniqueId, boolean> = {};

					let previousIds = directIds;
					let hasNewCid = true;
					while (hasNewCid) {
						const ids = findRelevantIds(previousIds, direction)
							.filter(found => found !== cid && !directIds.includes(found) && !sameRouteCidMap[found]);
						if (ids.length !== 0) {
							ids.forEach(cid => sameRouteCidMap[cid] = true);
							previousIds = ids;
						} else {
							hasNewCid = false;
						}
					}
					return {directIds, sameRouteCidMap};
				});
				const directIdMap = found
					.map(x => x.directIds)
					.flat()
					.reduce((map, cid) => {
						map[cid] = true;
						return map;
					}, {} as Record<ConsanguinityUniqueId, boolean>);
				const sameRouteIdMap = found.reduce((map, {sameRouteCidMap}) => {
					Object.keys(sameRouteCidMap).forEach(cid => map[cid] = true);
					return map;
				}, {} as Record<ConsanguinityUniqueId, boolean>);

				fire(ConsanguinityEventTypes.ACTIVE_SAME_ROUTE, {
					center: cid,
					direct: Object.keys(directIdMap),
					sameRoute: Object.keys(sameRouteIdMap)
				});
			}, 300);
		};
		on(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		return () => {
			off(ConsanguinityEventTypes.NODE_SELECTED, onNodeSelected);
		};
	}, [on, off, fire, saveQueue, consanguinity, relations]);

	return <Fragment/>;
};