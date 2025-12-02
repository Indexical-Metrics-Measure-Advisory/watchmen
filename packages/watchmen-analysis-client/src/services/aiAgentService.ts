import { AgentCard } from "@/model/A2ASpec";
import { BusinessChallenge, BusinessChallengeWithProblems } from "@/model/business";
import { SimulationResult } from "@/model/challengeAnalysis";
import { API_BASE_URL, checkResponse, getDefaultHeaders } from "@/utils/apiConfig";

let ai_mock = false;

class AIAgentService {
  

    async evaluate_insurance_business_challenge(challenge: BusinessChallenge): Promise<any> {
        // Call the AI agent to evaluate the challenge
        if (ai_mock) {
           
            const result = {
                isGoodChallenge: Math.random() > 0.3, // 70% chance it's a good challenge
                suggestions: ['Clarify Key Performance Indicators (KPI)', 'Narrow down problem scope to improve actionability'],
                requiredContext: ['Historical Claims Data', 'Customer Segmentation Information', 'Current Market Trend Report'],
              };
            return result 
        }


        const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/evaluate`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(challenge)
        });
        return await checkResponse(response);
    }

    //query_historical_experience
    async query_historical_experience(challenge: BusinessChallenge): Promise<any> {
        // Call the AI agent to evaluate the challenge
        if (ai_mock) {
           
            const result = {
                hasSimilar: Math.random() > 0.4,
                similarChallenges: [
                  { id: 'hist1', title: 'Last Quarter User Churn Analysis', outcome: 'Price Adjustment Strategy Partially Effective' },
                ],
              };
            return result 
        }


        const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/query`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(challenge)
        });
        return await checkResponse(response);
    }


    //query_knowledge_base 
    async query_knowledge_base(challenge: BusinessChallenge): Promise<string> {
        // Call the AI agent to evaluate the challenge
        const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/query/knowledge_base`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(challenge)
        });
        return await checkResponse(response);
    }

    //build_business_problem_simulation_environment
    async build_business_problem_simulation_environment(challenge: BusinessChallenge): Promise<SimulationResult> {
        // Call the AI agent to evaluate the challenge
        const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/simulate`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(challenge)
        });
        return await checkResponse(response);   
        
    }





    // attempt_to_answer_business_challenge
    async attempt_to_answer_business_challenge(cleanedSimulationResult): Promise<SimulationResult> {
        // Call the AI agent to evaluate the challenge
        const simulation_result = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/answer/evaluation`, {
        method: 'POST',
        headers: getDefaultHeaders(),
        body: JSON.stringify(cleanedSimulationResult)
      });
        return await checkResponse(simulation_result);
    }


    //build_conclusions_and_generate_analysis_report
    async build_conclusions_and_generate_analysis_report(simulation_result: Record<string, unknown>): Promise<SimulationResult> {
        // Call the AI agent to evaluate the challenge
        const response = await fetch(`${API_BASE_URL}/watchmen/ai/challenge/agent/conclusions`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(simulation_result)
        });
        return await checkResponse(response);
    }



    async create_or_update_agent(agent: AgentCard): Promise<AgentCard> {
        const response = await fetch(`${API_BASE_URL}/watchmen/ai/agent`, {
            method: 'POST',
            headers: getDefaultHeaders(),
            body: JSON.stringify(agent)
        });
        return await checkResponse(response);
    }




}


export const aiAgentService = new AIAgentService();