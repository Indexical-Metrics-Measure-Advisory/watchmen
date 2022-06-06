import {TuplePage} from '@/services/data/query/tuple-page';
import {QueryIndicator} from '@/services/data/tuples/query-indicator-types';
import {Fragment, useEffect, useState} from 'react';
import {useIndicatorsEventBus} from './indicators-event-bus';
import {IndicatorsEventTypes} from './indicators-event-bus-types';

interface ListData {
	page?: TuplePage<QueryIndicator>;
	searchText?: string;
	searched: boolean;
}

export const IndicatorListState = () => {
	const {on, off} = useIndicatorsEventBus();
	const [data, setData] = useState<ListData>({searched: false});

	useEffect(() => {
		const onSearched = (page: TuplePage<QueryIndicator>, searchText: string) => {
			setData({page, searchText, searched: true});
		};
		on(IndicatorsEventTypes.SEARCHED, onSearched);
		return () => {
			off(IndicatorsEventTypes.SEARCHED, onSearched);
		};
	}, [on, off]);
	useEffect(() => {
		const onAskSearched = (onData: (page?: TuplePage<QueryIndicator>, searchText?: string) => void) => {
			onData(data.page, data.searchText);
		};
		on(IndicatorsEventTypes.ASK_SEARCHED, onAskSearched);
		return () => {
			off(IndicatorsEventTypes.ASK_SEARCHED, onAskSearched);
		};
	}, [on, off, data.page, data.searchText]);

	return <Fragment/>;
};