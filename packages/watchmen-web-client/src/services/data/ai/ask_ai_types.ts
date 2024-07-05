import { Tuple} from "@/services/data/tuples/tuple-types";
import {Topic} from "@/services/data/tuples/topic-types";
import {Factor} from "@/services/data/tuples/factor-types";




export interface AskAIBase  {
    tenantId: string;
}


export interface AskAIGenerateFactors extends Tuple, AskAIBase {
    topic: Topic
    limit: number
}


export interface AskAIGenerateFactorsResponse extends  AskAIBase {
    suggestionFactors : Array<Factor>;
    response: string;
}



