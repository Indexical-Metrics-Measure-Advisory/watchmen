import {StandardTupleCard} from '@/widgets/tuple-workbench/tuple-card';
import React from 'react';
import {QueryAIModel} from "@/services/data/tuples/query-gpt-model";

export const renderCard = (aiModel: QueryAIModel) => {
    return <StandardTupleCard key={aiModel.modelId} tuple={aiModel}
                              name={() => aiModel.modelName}
                              description={() => `${aiModel.llmProvider || ''} @${aiModel.modelName || ''}`}/>;
};