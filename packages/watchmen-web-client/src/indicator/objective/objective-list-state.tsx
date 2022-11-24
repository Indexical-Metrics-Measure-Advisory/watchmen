import {TuplePage} from '@/services/data/query/tuple-page';
import {Objective} from '@/services/data/tuples/objective-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {Fragment, useEffect, useState} from 'react';
import {useObjectivesEventBus} from './objectives-event-bus';
import {ObjectivesEventTypes} from './objectives-event-bus-types';

interface ListData {
	page?: TuplePage<QueryObjective>;
	searchText?: string;
	searched: boolean;
}

export const ObjectiveListState = () => {
	const {on, off} = useObjectivesEventBus();
	const [data, setData] = useState<ListData>({searched: false});

	useEffect(() => {
		const onSearched = (page: TuplePage<QueryObjective>, searchText: string) => {
			setData({page, searchText, searched: true});
		};
		on(ObjectivesEventTypes.SEARCHED, onSearched);
		return () => {
			off(ObjectivesEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);
	useEffect(() => {
		const onAskSearched = (onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void) => {
			onData(data.page, data.searchText);
		};
		on(ObjectivesEventTypes.ASK_SEARCHED, onAskSearched);
		return () => {
			off(ObjectivesEventTypes.ASK_SEARCHED, onAskSearched);
		};
	}, [on, off, data.page, data.searchText]);
	useEffect(() => {
		const onObjectiveSaved = (objective: Objective) => {
			// eslint-disable-next-line
			const existing = data.page?.data?.find(existing => existing.objectiveId == objective.objectiveId);
			if (existing != null) {
				existing.name = objective.name;
				existing.description = objective.description;
			}
		};
		on(ObjectivesEventTypes.OBJECTIVE_SAVED, onObjectiveSaved);
		return () => {
			off(ObjectivesEventTypes.OBJECTIVE_SAVED, onObjectiveSaved);
		};
	}, [on, off, data.page?.data]);

	return <Fragment/>;
};