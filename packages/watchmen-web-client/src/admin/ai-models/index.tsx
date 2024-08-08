import {TuplePage} from '@/services/data/query/tuple-page';
import {listTenants} from '@/services/data/tuples/tenant';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {HELP_KEYS, useHelp} from '@/widgets/help';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {useEffect} from 'react';
import DataSourceBackground from '../../assets/data-source-background.svg';
import {useAdminCacheEventBus} from '../cache/cache-event-bus';
import {renderCard} from './card';
import {renderEditor} from './editor';
import {createGptModel} from './utils';
import {fetchGPTModelById, listGptModels, saveGPTModel} from "@/services/data/tuples/gpt-model";
import {AIModel,} from "@/services/data/tuples/gpt-model-types";
import {QueryAIModel} from "@/services/data/tuples/query-gpt-model";
import {useNavigate} from "react-router-dom";
import {isWriteExternalEnabled} from "@/feature-switch";
import {isSuperAdmin} from "@/services/data/account";
import {Router} from "@/routes/types";


const fetchGptModels = async (queryAiModel:QueryAIModel) => {
    const gptModel = await fetchGPTModelById(queryAiModel.modelId);
    const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
    return {tuple: gptModel, tenants};
};

const getKeyOfAIModel = (queryAIModel: QueryAIModel) => queryAIModel.modelId;

const AdminAIModels = () => {
    const {fire: fireGlobal} = useEventBus();
    const {fire: fireCache} = useAdminCacheEventBus();
    const {on, off, fire} = useTupleEventBus();
    useEffect(() => {
        const onDoCreateGptModel = async () => {
            const aiModel = createGptModel();
            fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
                async () => {
                    const {data: tenants} = await listTenants({search: '', pageNumber: 1, pageSize: 9999});
                    return {tenants};
                },
                ({tenants}) => fire(TupleEventTypes.TUPLE_CREATED, aiModel, {tenants}));
        };
        const onDoEditGptModel = async (queryAIModel: QueryAIModel) => {
            // console.log("test test")
            fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
                async () => await fetchGptModels(queryAIModel),
                ({tuple, tenants}) => fire(TupleEventTypes.TUPLE_LOADED, tuple, {tenants}));
        };
        const onDoSearchGptModel = async (searchText: string, pageNumber: number) => {
            fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
                async () => await listGptModels({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
                (page: TuplePage<QueryTuple>) => fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText));
        };
        const onSaveGptModel = async (aiModel: AIModel, onSaved: (gptModel: AIModel, saved: boolean) => void) => {
            if (!aiModel.modelName || !aiModel.modelName.trim()) {
                fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>AI LLM model Name is required.</AlertLabel>, () => {
                    onSaved(aiModel, false);
                });
                return;
            }


            if (!aiModel.modelToken) {
                fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>AI LLM Model token  is required.</AlertLabel>, () => {
                    onSaved(aiModel, false);
                });
                return;
            }


            if (aiModel.tenantId === '1') {
                fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>ai Model Data zone is required.</AlertLabel>, () => {
                    onSaved(aiModel, false);
                });
                return;
            }



            fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
                return await saveGPTModel(aiModel);
            }, () => {
                onSaved(aiModel, true);
                // fireCache(AdminCacheEventTypes.SAVE_DATA_SOURCE, dataSource);
            }, () => onSaved(aiModel, false));
        };
        on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateGptModel);
        on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditGptModel);
        on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchGptModel);
        on(TupleEventTypes.SAVE_TUPLE, onSaveGptModel);
        return () => {
            off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateGptModel);
            off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditGptModel);
            off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchGptModel);
            off(TupleEventTypes.SAVE_TUPLE, onSaveGptModel);
        };
    }, [on, off, fire, fireCache, fireGlobal]);
    useHelp(HELP_KEYS.ADMIN_DATA_SOURCE);

    return <TupleWorkbench title="AI Models"
                           createButtonLabel="Create AI Model" canCreate={true}
                           searchPlaceholder="Search by ai model name, zone name, etc."
                           tupleLabel="AI Model" tupleImage={DataSourceBackground} tupleImagePosition="left 80px"
                           renderEditor={renderEditor}
                           newTupleLabelPrefix="New" existingTupleLabelPrefix=""
                           renderCard={renderCard} getKeyOfTuple={getKeyOfAIModel}
    />;
};

const AdminAIModelsIndex = () => {
    const navigate = useNavigate();
    if (!isWriteExternalEnabled()) {
        if (isSuperAdmin()) {
            navigate(Router.ADMIN_TENANTS, {replace: true});
        } else {
            navigate(Router.ADMIN_HOME, {replace: true});
        }
        return null;
    }

    return <TupleEventBusProvider>
        <AdminAIModels/>
    </TupleEventBusProvider>;
};

export default AdminAIModelsIndex;