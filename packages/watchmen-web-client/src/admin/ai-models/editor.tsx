import React from 'react';
import {AIModel} from "@/services/data/tuples/gpt-model-types";
import {ModelSetting} from "@/admin/ai-models/gpt/llm_model_settings";
import {QueryTenantForHolder} from "@/services/data/tuples/query-tenant-types";
import {HoldByAIModel} from "@/admin/ai-models/utils";

const AIModelEditor = (props: { aiModel: AIModel ,tenants: Array<QueryTenantForHolder>;}) => {
    const {aiModel,tenants} = props;

    return <>
      <ModelSetting model={aiModel} tenants={tenants}/>
    </>
};

export const renderEditor = (aiModel: AIModel, codes?: HoldByAIModel) => {
    const tenants: Array<QueryTenantForHolder> = (codes?.tenants || []);
    return <AIModelEditor aiModel={aiModel} tenants={tenants}/>;
};
