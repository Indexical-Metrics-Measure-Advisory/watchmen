import ObjectiveBackground from '@/assets/objective-background.svg';
import {Router} from '@/routes/types';
import {TuplePage} from '@/services/data/query/tuple-page';
import {listObjectives} from '@/services/data/tuples/objective';
import {Objective} from '@/services/data/tuples/objective-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import {Navigate} from 'react-router-dom';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';
import {renderCard} from './card';

const getKeyOfObjective = (objective: QueryObjective) => objective.objectiveId;
// noinspection JSUnusedLocalSymbols
const renderEditor = (objective: Objective) => <Navigate to={Router.IDW_OBJECTIVE_EDIT}/>;

const RealObjectiveList = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();
	const {fire: fireObjective} = useObjectivesEventBus();
	useEffect(() => {
		const onDoCreateObjective = async () => {
			fireObjective(ObjectivesEventTypes.CREATE_OBJECTIVE, (objective: Objective) => {
				fire(TupleEventTypes.TUPLE_CREATED, objective);
			});
		};
		const onDoEditObjective = async (queryObjective: QueryObjective) => {
			fireObjective(ObjectivesEventTypes.PICK_OBJECTIVE, queryObjective.objectiveId, (objective: Objective) => {
				fire(TupleEventTypes.TUPLE_LOADED, objective);
			});
		};
		const onDoSearchObjective = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listObjectives({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryObjective>) => {
					fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText);
					fireObjective(ObjectivesEventTypes.SEARCHED, page, searchText);
				});
		};
		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateObjective);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditObjective);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchObjective);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateObjective);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditObjective);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchObjective);
		};
	}, [on, off, fire, fireObjective, fireGlobal]);
	useEffect(() => {
		fireObjective(ObjectivesEventTypes.ASK_SEARCHED, (page?: TuplePage<QueryObjective>, searchText?: string) => {
			if (page) {
				fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText ?? '');
			}
		});
	}, [fire, fireObjective]);

	return <TupleWorkbench title={Lang.INDICATOR.OBJECTIVE.LIST_TITLE}
	                       createButtonLabel={Lang.INDICATOR.OBJECTIVE.LIST_CREATE_OBJECTIVE} canCreate={true}
	                       searchPlaceholder={Lang.PLAIN.FIND_OBJECTIVE_PLACEHOLDER}
	                       tupleLabel={Lang.INDICATOR.OBJECTIVE.LIST_LABEL}
	                       newTupleLabelPrefix={Lang.INDICATOR.OBJECTIVE.NEW_OBJECTIVE_PREFIX}
	                       existingTupleLabelPrefix={Lang.INDICATOR.OBJECTIVE.EXISTING_OBJECTIVE_PREFIX}
	                       tupleImage={ObjectiveBackground} tupleImagePosition="left 120px"
	                       renderEditor={renderEditor}
	                       confirmEditButtonLabel={Lang.ACTIONS.CONFIRM}
	                       closeEditButtonLabel={Lang.ACTIONS.CLOSE}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfObjective}
	/>;
};

const ObjectiveList = () => {
	return <TupleEventBusProvider>
		<RealObjectiveList/>
	</TupleEventBusProvider>;
};

export default ObjectiveList;