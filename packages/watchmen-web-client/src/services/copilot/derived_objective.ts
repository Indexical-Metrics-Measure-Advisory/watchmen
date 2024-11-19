import {CopilotAnswerWithSession} from "@/services/copilot/types";
import {isMockService} from "@/services/data/utils";
import {mockStartConnectedSpaceCopilotSession} from "@/services/copilot/mock/connected-space";
import {Apis, post} from "@/services/data/apis";
import {DerivedObjectiveId} from "@/services/data/tuples/derived-objective-types";

export const startDerivedObjectiveCopilotSession = async (sessionId: string,derivedObjectiveId:DerivedObjectiveId, withRecommendation: boolean): Promise<CopilotAnswerWithSession> => {
    if (isMockService()) {
        return await mockStartConnectedSpaceCopilotSession(sessionId, withRecommendation);
    } else {
        const data = await post({
            api: Apis.COPILOT_CREATE_DERIVED_OBJECTIVE_SESSION,
            data: {sessionId, recommendation: withRecommendation,derivedObjectiveId:derivedObjectiveId}
        });



        return data
    }
};