import {TuplePage} from '@/services/data/query/tuple-page';
import {Convergence} from '@/services/data/tuples/convergence-types';
import {QueryConvergence} from '@/services/data/tuples/query-convergence-types';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';

interface ListData {
	page?: TuplePage<QueryConvergence>;
	searchText?: string;
	searched: boolean;
}

export const useConvergenceList = () => {
	const {on, off} = useConvergencesEventBus();
	const [data, setData] = useState<ListData>({searched: false});

	useEffect(() => {
		const onSearched = (page: TuplePage<QueryConvergence>, searchText: string) => {
			setData({page, searchText, searched: true});
		};
		on(ConvergencesEventTypes.SEARCHED, onSearched);
		return () => {
			off(ConvergencesEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);
	useEffect(() => {
		const onAskSearched = (onData: (page?: TuplePage<QueryConvergence>, searchText?: string) => void) => {
			onData(data.page, data.searchText);
		};
		on(ConvergencesEventTypes.ASK_SEARCHED, onAskSearched);
		return () => {
			off(ConvergencesEventTypes.ASK_SEARCHED, onAskSearched);
		};
	}, [on, off, data.page, data.searchText]);
	useEffect(() => {
		const onConvergenceSaved = (convergence: Convergence) => {
			// eslint-disable-next-line
			const existing = data.page?.data?.find(existing => existing.convergenceId == convergence.convergenceId);
			if (existing != null) {
				existing.name = convergence.name;
				existing.description = convergence.description;
			}
		};
		on(ConvergencesEventTypes.CONVERGENCE_SAVED, onConvergenceSaved);
		return () => {
			off(ConvergencesEventTypes.CONVERGENCE_SAVED, onConvergenceSaved);
		};
	}, [on, off, data.page?.data]);
};