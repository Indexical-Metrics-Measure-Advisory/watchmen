import IndicatorBackground from '@/assets/indicator-background.svg';
import {TuplePage} from '@/services/data/query/tuple-page';
import {fetchIndicator, listIndicators} from '@/services/data/tuples/indicator';
import {QueryIndicator} from '@/services/data/tuples/query-indicator-types';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {useIndicatorsEventBus} from '../indicators-event-bus';
import {IndicatorsEventTypes} from '../indicators-event-bus-types';
import {renderCard} from './card';
import {renderEditor} from './editor';

const getKeyOfIndicator = (indicator: QueryIndicator) => indicator.indicatorId;

export const RealIndicatorList = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	const {fire: fireIndicator} = useIndicatorsEventBus();
	useEffect(() => {
		const onDoCreateIndicator = async () => {
			// fire(TupleEventTypes.TUPLE_CREATED, createIndicator());
		};
		const onDoEditIndicator = async (queryIndicator: QueryIndicator) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const {indicator} = await fetchIndicator(queryIndicator.indicatorId);
					return {tuple: indicator};
				},
				({tuple}) => {
					// fire(TupleEventTypes.TUPLE_LOADED, tuple);
				});
		};
		const onDoSearchIndicator = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listIndicators({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryTuple>) => {
					fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText);
					fireIndicator(IndicatorsEventTypes.SEARCHED, page, searchText);
				});
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateIndicator);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditIndicator);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchIndicator);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateIndicator);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditIndicator);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchIndicator);
		};
	}, [on, off, fire, fireIndicator, fireGlobal]);

	return <TupleWorkbench title={Lang.INDICATOR_WORKBENCH.INDICATOR.LIST_TITLE}
	                       createButtonLabel={Lang.INDICATOR_WORKBENCH.INDICATOR.LIST_CREATE_INDICATOR} canCreate={true}
	                       searchPlaceholder={Lang.PLAIN.FIND_INDICATOR_PLACEHOLDER}
	                       tupleLabel={Lang.INDICATOR_WORKBENCH.INDICATOR.LIST_LABEL}
	                       newTupleLabelPrefix={Lang.INDICATOR_WORKBENCH.INDICATOR.NEW_INDICATOR_PREFIX}
	                       existingTupleLabelPrefix={Lang.INDICATOR_WORKBENCH.INDICATOR.EXISTING_INDICATOR_PREFIX}
	                       tupleImage={IndicatorBackground} tupleImagePosition="left 120px"
	                       renderEditor={renderEditor}
	                       confirmEditButtonLabel={Lang.ACTIONS.CONFIRM}
	                       closeEditButtonLabel={Lang.ACTIONS.CLOSE}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfIndicator}
	/>;
};

const IndicatorList = () => {
	return <TupleEventBusProvider>
		<RealIndicatorList/>
	</TupleEventBusProvider>;
};

export default IndicatorList;