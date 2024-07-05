import React, {ChangeEvent} from 'react';
import {useForceUpdate} from "@/widgets/basic/utils";

import {TuplePropertyInput, TuplePropertyLabel} from "@/widgets/tuple-workbench/tuple-editor";
import {Toggle} from "@/widgets/basic/toggle";
import {ModelProviderInput} from "@/admin/ai-models/gpt/model_provider_input";
import {AIModel, GptProviderKind} from "@/services/data/tuples/gpt-model-types";
import styled from "styled-components";
import {DropdownOption} from "@/widgets/basic/types";
import {TupleEventTypes, TupleState} from "@/widgets/tuple-workbench/tuple-event-bus-types";
import {useTupleEventBus} from "@/widgets/tuple-workbench/tuple-event-bus";
import {GptModelEventBusProvider} from "@/admin/ai-models/gpt/gpt_model_bus";
import {AIModelTenantInput} from "@/admin/ai-models/gpt/ai-model-tenant-input";
import {QueryTenantForHolder} from "@/services/data/tuples/query-tenant-types";


export const PropertyContainer = styled.div.attrs({'data-widget': 'tuple-property-label'})`
    display: flex;
    align-self: start;
    align-items: center;
    height: var(--grid-tall-row-height);
`;


export const ModelSetting = (props: { model: AIModel, tenants: Array<QueryTenantForHolder> }) => {
    const {model, tenants} = props;

    const { fire} = useTupleEventBus();

    const forceUpdate = useForceUpdate();


    const onPropChange = (prop: 'modelName' | 'modelVersion' | 'modelToken' | 'baseUrl' | 'embeddingName' | 'embeddingVersion' | 'baseEmbeddingUrl' | 'embeddingToken') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (model[prop] !== event.target.value) {
            model[prop] = event.target.value;
            fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
            forceUpdate();
        }
    };

    const onBooleanChange = (prop: 'enableMonitor') => (value: boolean) => {
        if (model[prop] !== value) {
            model[prop] = value;
            fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
            forceUpdate();
        }
    }


    const onDropdownChange = (prop: 'llmProvider' | 'embeddingProvider') => (option: DropdownOption) => {
        const value = option.value as GptProviderKind;
        if (model[prop] !== value) {
            model[prop] = value;
            fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
            forceUpdate();
        }
    }


    return <GptModelEventBusProvider>

        <TuplePropertyLabel>Hold by Data Zone:</TuplePropertyLabel>
        <AIModelTenantInput aiModel={model} tenants={tenants}/>

        <TuplePropertyLabel>Provider:</TuplePropertyLabel>
        <ModelProviderInput value={model.llmProvider} onChange={onDropdownChange('llmProvider')}/>

        <TuplePropertyLabel>Model Name:</TuplePropertyLabel>
        <TuplePropertyInput value={model.modelName || ''} placeholder={"text_davinci_003"}
                            onChange={onPropChange('modelName')}/>

        <TuplePropertyLabel>Model Version:</TuplePropertyLabel>
        <TuplePropertyInput value={model.modelVersion || ''} onChange={onPropChange('modelVersion')}/>

        <TuplePropertyLabel>Model Token:</TuplePropertyLabel>
        <TuplePropertyInput value={model.modelToken || ''} onChange={onPropChange('modelToken')}/>

        <TuplePropertyLabel>Base URL:</TuplePropertyLabel>
        <TuplePropertyInput value={model.baseUrl || ''} onChange={onPropChange('baseUrl')}/>

        <TuplePropertyLabel>Embedding Provider:</TuplePropertyLabel>
        <ModelProviderInput value={model.embeddingProvider}
                            onChange={onDropdownChange('embeddingProvider')}/>

        <TuplePropertyLabel>Embedding Name:</TuplePropertyLabel>
        <TuplePropertyInput value={model.embeddingName || ''} placeholder={"text-embedding-ada-002"}
                            onChange={onPropChange('embeddingName')}/>

        <TuplePropertyLabel>Embedding Version:</TuplePropertyLabel>
        <TuplePropertyInput value={model.embeddingVersion || ''} onChange={onPropChange('embeddingVersion')}/>

        <TuplePropertyLabel>Embedding Token:</TuplePropertyLabel>
        <TuplePropertyInput value={model.embeddingToken || ''} onChange={onPropChange('embeddingToken')}/>

        <TuplePropertyLabel>Base Embedding URL:</TuplePropertyLabel>
        <TuplePropertyInput value={model.baseEmbeddingUrl || ''} onChange={onPropChange('baseEmbeddingUrl')}/>

        <TuplePropertyLabel>Enable Monitor:</TuplePropertyLabel>
        <PropertyContainer>
            <Toggle value={model.enableMonitor} onChange={onBooleanChange("enableMonitor")}/>
        </PropertyContainer>


    </GptModelEventBusProvider>
};