import {Tenant} from '@/services/data/tuples/tenant-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyInput, TuplePropertyLabel} from '@/widgets/tuple-workbench/tuple-editor';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {ChangeEvent} from 'react';
import {PropertyContainer} from "@/admin/ai-models/gpt/llm_model_settings";
import {Toggle} from "@/widgets/basic/toggle";

const TenantEditor = (props: { tenant: Tenant }) => {
    const {tenant} = props;

    const {fire} = useTupleEventBus();
    const forceUpdate = useForceUpdate();

    const onPropChange = (prop: 'name') => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (tenant[prop] !== event.target.value) {
            tenant[prop] = event.target.value;
            fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
            forceUpdate();
        }
    };

    const onBooleanChangeForTenant = (prop: 'enableAI') => (value: boolean) => {
        if (tenant[prop] !== value) {
            tenant[prop] = value;
            fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
            forceUpdate();

        }

    }

    const getEnableAIValue = (tenant: Tenant) => {

        // console.log(tenant.enableAI)
        if (tenant.enableAI === null) {
            return false;
        }

        return tenant.enableAI;
    }

    return <>
        <TuplePropertyLabel>Zone Name:</TuplePropertyLabel>
        <TuplePropertyInput value={tenant.name || ''} onChange={onPropChange('name')}/>
        <TuplePropertyLabel>Enable AI [Beta] :</TuplePropertyLabel>
        <PropertyContainer>
            <Toggle value={getEnableAIValue(tenant)} onChange={onBooleanChangeForTenant("enableAI")}/>
        </PropertyContainer>
    </>
};

export const renderEditor = (tenant: Tenant) => {
    return <TenantEditor tenant={tenant}/>;
};
