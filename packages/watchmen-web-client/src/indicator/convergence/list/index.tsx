import ConvergenceBackground from '@/assets/convergence-background.svg';
import {Router} from '@/routes/types';
import {TuplePage} from '@/services/data/query/tuple-page';
import {listConvergences} from '@/services/data/tuples/convergence';
import {Convergence} from '@/services/data/tuples/convergence-types';
import {QueryConvergence} from '@/services/data/tuples/query-convergence-types';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {Navigate} from 'react-router-dom';
import {useConvergencesEventBus} from '../convergences-event-bus';
import {ConvergencesEventTypes} from '../convergences-event-bus-types';
import {renderCard} from './card';

const getKeyOfConvergence = (convergence: QueryConvergence) => convergence.convergenceId;
// noinspection JSUnusedLocalSymbols
const renderEditor = (convergence: Convergence) => <Navigate to={Router.IDW_CONVERGENCE_EDIT}/>;

const RealConvergenceList = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	const {fire: fireConvergence} = useConvergencesEventBus();
	useEffect(() => {
		const onDoCreateConvergence = async () => {
			fireConvergence(ConvergencesEventTypes.CREATE_CONVERGENCE, (convergence: Convergence) => {
				fire(TupleEventTypes.TUPLE_CREATED, convergence);
			});
		};
		const onDoEditConvergence = async (queryConvergence: QueryConvergence) => {
			fireConvergence(ConvergencesEventTypes.PICK_CONVERGENCE, queryConvergence.convergenceId, (convergence: Convergence) => {
				fire(TupleEventTypes.TUPLE_LOADED, convergence);
			});
		};
		const onDoSearchConvergence = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listConvergences({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryConvergence>) => {
					fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText);
					fireConvergence(ConvergencesEventTypes.SEARCHED, page, searchText);
				});
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateConvergence);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditConvergence);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchConvergence);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateConvergence);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditConvergence);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchConvergence);
		};
	}, [on, off, fire, fireConvergence, fireGlobal]);
	useEffect(() => {
		fireConvergence(ConvergencesEventTypes.ASK_SEARCHED, (page?: TuplePage<QueryConvergence>, searchText?: string) => {
			if (page) {
				fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText ?? '');
			}
		});
	}, [fire, fireConvergence]);

	return <TupleWorkbench title={Lang.INDICATOR.CONVERGENCE.LIST_TITLE}
	                       createButtonLabel={Lang.INDICATOR.CONVERGENCE.LIST_CREATE_CONVERGENCE} canCreate={true}
	                       searchPlaceholder={Lang.PLAIN.FIND_CONVERGENCE_PLACEHOLDER}
	                       tupleLabel={Lang.INDICATOR.CONVERGENCE.LIST_LABEL}
	                       newTupleLabelPrefix={Lang.INDICATOR.CONVERGENCE.NEW_CONVERGENCE_PREFIX}
	                       existingTupleLabelPrefix={Lang.INDICATOR.CONVERGENCE.EXISTING_CONVERGENCE_PREFIX}
	                       tupleImage={ConvergenceBackground} tupleImagePosition="left 120px"
	                       renderEditor={renderEditor}
	                       confirmEditButtonLabel={Lang.ACTIONS.CONFIRM}
	                       closeEditButtonLabel={Lang.ACTIONS.CLOSE}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfConvergence}
	/>;
};

const ConvergenceList = () => {
	return <TupleEventBusProvider>
		<RealConvergenceList/>
	</TupleEventBusProvider>;
};

export default ConvergenceList;