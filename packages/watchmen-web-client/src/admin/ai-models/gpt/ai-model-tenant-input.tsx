import {QueryTenantForHolder} from "@/services/data/tuples/query-tenant-types";
import {useForceUpdate} from "@/widgets/basic/utils";
import {DropdownOption} from "@/widgets/basic/types";
import {TuplePropertyDropdown} from "@/widgets/tuple-workbench/tuple-editor";
import React from "react";
import {AIModel} from "@/services/data/tuples/gpt-model-types";
import {GptModelEventTypes} from "@/admin/ai-models/gpt/gpt_model_bus_types";
import {useAIModelEventBus} from "@/admin/ai-models/gpt/gpt_model_bus";

export const AIModelTenantInput = (props: { aiModel: AIModel, tenants: Array<QueryTenantForHolder> }) => {
    const {aiModel, tenants} = props;

    //TODO
    const {fire} = useAIModelEventBus();
    const forceUpdate = useForceUpdate();

    const onTenantChange = (option: DropdownOption) => {
        aiModel.tenantId = option.value as string;
        //TODO
        fire(GptModelEventTypes.AI_MODEL_TENANT_CHANGE, aiModel);
        forceUpdate();
    };

    const options: Array<DropdownOption> = tenants.map(candidate => {
        return {value: candidate.tenantId, label: candidate.name};
    });


    // console.log(aiModel.tenantId)

    return <TuplePropertyDropdown value={aiModel.tenantId} options={options} onChange={onTenantChange}/>;
};