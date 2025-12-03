
import {fetchAiModel, listAiModels, saveAiModel} from '@/services/data/tuples/ai-model';
import {AiModel} from '@/services/data/tuples/ai-model-types';
import {listTenants} from '@/services/data/tuples/tenant';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import {TuplePage} from '@/services/data/query/tuple-page';
import React, {useEffect} from 'react';
import DataSourceBackground from '../../assets/data-source-background.svg';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {createAiModel} from './utils';

const fetchAiModelAndCodes = async (model: AiModel) => {
	const {model: fetchedModel} = await fetchAiModel(model.modelId);
	const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
	return {tuple: fetchedModel, tenants};
};

const getKeyOfAiModel = (model: AiModel) => model.modelId;

const AdminAiModels = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useTupleEventBus();

	useEffect(() => {
		const onDoCreateAiModel = () => {
			const model = createAiModel();
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
					return {tenants};
				},
				({tenants}) => fire(TupleEventTypes.TUPLE_CREATED, model, {tenants}));
		};
		const onDoEditAiModel = async (model: AiModel) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await fetchAiModelAndCodes(model),
				({tuple, tenants}) => fire(TupleEventTypes.TUPLE_LOADED, tuple, {tenants}));
		};
		const onDoSearchAiModel = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listAiModels({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
		};
		const onSaveAiModel = async (model: AiModel, onSaved: (model: AiModel, saved: boolean) => void) => {
			if (!model.modelCode || !model.modelCode.trim()) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Model code is required.</AlertLabel>, () => {
					onSaved(model, false);
				});
				return;
			}
			if (!model.provider) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Provider is required.</AlertLabel>, () => {
					onSaved(model, false);
				});
				return;
			}
			if (!model.tenantId) {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>Data zone is required.</AlertLabel>, () => {
					onSaved(model, false);
				});
				return;
			}

			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				return await saveAiModel(model);
			}, () => {
				onSaved(model, true);
			}, () => onSaved(model, false));
		};

		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateAiModel);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditAiModel);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchAiModel);
		on(TupleEventTypes.SAVE_TUPLE, onSaveAiModel);

		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateAiModel);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditAiModel);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchAiModel);
			off(TupleEventTypes.SAVE_TUPLE, onSaveAiModel);
		};
	}, [on, off, fire, fireGlobal]);

	return <TupleWorkbench title="AI Models"
	                       createButtonLabel="Create AI Model" canCreate={true}
	                       searchPlaceholder="Search by model name, etc."
	                       tupleLabel="AI Model" tupleImage={DataSourceBackground} tupleImagePosition="left 80px"
	                       renderEditor={renderEditor}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfAiModel}
	/>;
};

const AdminAiModelsIndex = () => {
	return <TupleEventBusProvider>
		<AdminAiModels/>
	</TupleEventBusProvider>;
};

export default AdminAiModelsIndex;
