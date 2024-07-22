
import {AskAIGenerateFactorsResponse} from "@/services/data/ai/ask_ai_types";
import {EnumId} from "@/services/data/tuples/enum-types";
import {FactorEncryptMethod, FactorId, FactorIndexGroup, FactorType} from "@/services/data/tuples/factor-types";


// factorId: FactorId;
// name: string;
// label: string;
// type: FactorType;
// enumId?: EnumId;
// defaultValue?: string;
// indexGroup?: FactorIndexGroup;
// // will flatten to table column or not, only used in raw topic, and must be top level factor
// flatten?: boolean;
// encrypt?: FactorEncryptMethod;
// precision?: string;
// description?: string;

const suggestionTopics: AskAIGenerateFactorsResponse = {
    tenantId: "tenantId",
    suggestionFactors: [
        {
            factorId: "123131",
            name: "Policy_Type",
            label: "Policy Type",
            type: FactorType.TEXT,
            description:'Different types of policies such as health, life, auto, home, etc.'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Premium",
            label: "Premium",
            type: FactorType.NUMBER,
            description:'The cost of the policy to the policyholder.'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Coverage_Amount",
            label: "Coverage Amount",
            type: FactorType.NUMBER,
            description:'[$ Coverage Amount]'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Policy Term",
            label: "Policy Term",
            type: FactorType.DATE,
            description:'The duration of the policy coverage period.'
            // indexGroup: FactorIndexGroup.GROUP,
        },{
            factorId: "123131",
            name: "Premium_Payment_Frequency",
            label: "Premium Payment Frequency",
            type: FactorType.TEXT,
            description:'Monthly/Quarterly/Annually'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Riders_Cost",
            label: "Riders Cost",
            type: FactorType.NUMBER,
            defaultValue: "defaultValue",
            description:'$ Cost for Each Rider'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Discounts",
            label: "Discounts",
            type: FactorType.NUMBER,
            description:'Details on any applicable discounts'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Base_Premium",
            label: "Base Premium",
            type: FactorType.NUMBER,
            description:'$ Base Premium Amount'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Total Premium",
            label: "Total Premium",
            type: FactorType.NUMBER,
            description:'$ Total Premium Amount'
            // indexGroup: FactorIndexGroup.GROUP,
        },
        {
            factorId: "123131",
            name: "Primary_Beneficiary",
            label: "Primary Beneficiary",
            type: FactorType.TEXT,
            description:'Name, Relationship, Percentage of Benefit'
            // indexGroup: FactorIndexGroup.GROUP,
        }

    ],
    response: "response"
};


export const fetchAIRes = async (): Promise<AskAIGenerateFactorsResponse> => {
    return suggestionTopics
};

