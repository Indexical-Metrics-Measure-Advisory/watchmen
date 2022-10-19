import IndicatorBackground from '@/assets/indicator-background.svg';
import {TuplePage} from '@/services/data/query/tuple-page';
import {listIndicators} from '@/services/data/tuples/indicator';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {QueryIndicator} from '@/services/data/tuples/query-indicator-types';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {useIndicatorsEventBus} from '../indicators-event-bus';
import {IndicatorsData, IndicatorsEventTypes} from '../indicators-event-bus-types';
import {renderCard} from './card';
import {renderEditor} from './editor';

const getKeyOfIndicator = (indicator: QueryIndicator) => indicator.indicatorId;

export const RealIndicatorList = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	const {fire: fireIndicator} = useIndicatorsEventBus();
	useEffect(() => {
		const onDoCreateIndicator = async () => {
			fireIndicator(IndicatorsEventTypes.CREATE_INDICATOR, (indicator: Indicator) => {
				fire(TupleEventTypes.TUPLE_CREATED, indicator);
			});
		};
		const onDoEditIndicator = async (queryIndicator: QueryIndicator) => {
			fireIndicator(IndicatorsEventTypes.PICK_INDICATOR, queryIndicator.indicatorId, (data: IndicatorsData) => {
				fire(TupleEventTypes.TUPLE_LOADED, data.indicator!);
			});
		};
		const onDoSearchIndicator = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listIndicators({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryIndicator>) => {
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
	useEffect(() => {
		fireIndicator(IndicatorsEventTypes.ASK_SEARCHED, (page?: TuplePage<QueryIndicator>, searchText?: string) => {
			if (page) {
				fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText ?? '');
			}
		});
	}, [fire, fireIndicator]);

	return <TupleWorkbench title={Lang.INDICATOR.INDICATOR.LIST_TITLE}
	                       createButtonLabel={Lang.INDICATOR.INDICATOR.LIST_CREATE_INDICATOR} canCreate={true}
	                       searchPlaceholder={Lang.PLAIN.FIND_INDICATOR_PLACEHOLDER}
	                       tupleLabel={Lang.INDICATOR.INDICATOR.LIST_LABEL}
	                       newTupleLabelPrefix={Lang.INDICATOR.INDICATOR.NEW_INDICATOR_PREFIX}
	                       existingTupleLabelPrefix={Lang.INDICATOR.INDICATOR.EXISTING_INDICATOR_PREFIX}
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