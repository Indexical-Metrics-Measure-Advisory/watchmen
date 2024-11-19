import {isMockService} from "@/services/data/utils";
import {Apis, post} from "@/services/data/apis";
import {Topic} from "@/services/data/tuples/topic-types";
import {AskAIGenerateFactors, AskAIGenerateFactorsResponse} from "@/services/data/ai/ask_ai_types";
import {fetchAIRes} from "@/services/data/mock/tuples/mock_ask_ai";


export const askAIGenerateFactors = async (
    topic: Topic): Promise<AskAIGenerateFactorsResponse> => {

    if (isMockService()) {
        return fetchAIRes();
    } else {
        // const ask_ai_req = {
        //     tenantId : topic.tenantId,
        //     topic : topic,
        // } as AskAIGenerateFactors
        return await post({api: Apis.ASK_AI_GENERATE_TOPIC_FACTORS, data: topic});
    }
};


export const askAIGenerateDescription = async (
    topic: Topic): Promise<AskAIGenerateFactorsResponse> => {

    if (isMockService()) {
        return fetchAIRes();
    } else {
        const ask_ai_req = {
            tenantId : topic.tenantId,
            topic : topic,
        } as AskAIGenerateFactors
        return await post({api: Apis.ASK_AI_GENERATE_TOPIC_FACTORS, data: ask_ai_req});
    }
};