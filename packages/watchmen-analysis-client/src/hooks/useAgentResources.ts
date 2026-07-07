import { useState, useEffect } from 'react';
import { BusinessChallengeWithProblems } from '@/model/business';
import { AgentCard } from '@/model/A2ASpec';
import { a2aService } from '@/services/a2aService';
import { businessService } from '@/services/businessService';

export interface AgentResources {
  currentAgent: AgentCard | null;
  businessChallenge: BusinessChallengeWithProblems | null;
  resourcesLoaded: { agentLoaded: boolean; challengeLoaded: boolean };
  addLog: (type: string, title: string, description: string, status: string) => void;
}

export function useAgentResources(
  agentId: string | null,
  setIsRunning: (running: boolean) => void
): AgentResources {
  const [currentAgent, setCurrentAgent] = useState<AgentCard | null>(null);
  const [businessChallenge, setBusinessChallenge] = useState<BusinessChallengeWithProblems | null>(null);
  const [resourcesLoaded, setResourcesLoaded] = useState({
    agentLoaded: false,
    challengeLoaded: false
  });

  const addLog = (type: string, title: string, description: string, status: string) => {
    // This is a placeholder - the real addLog from useAgentEngine should be used.
    // The parent component can override this by passing through context or props.
    console.log(`[AgentResource] ${type}: ${title} - ${description}`);
  };

  useEffect(() => {
    setResourcesLoaded({ agentLoaded: false, challengeLoaded: false });

    if (!agentId) return;

    a2aService.getAgent(agentId).then((agent) => {
      if (agent) {
        setCurrentAgent(agent);
        setResourcesLoaded(prev => ({ ...prev, agentLoaded: true }));

        const challengeId: string = agent.metadata?.businessChallengeId;
        if (challengeId) {
          businessService.getBusinessChallengeById(challengeId)
            .then((challenge) => {
              if (challenge) {
                setBusinessChallenge(challenge);
                setResourcesLoaded(prev => ({ ...prev, challengeLoaded: true }));
              } else {
                setIsRunning(false);
              }
            })
            .catch(() => {
              setIsRunning(false);
            });
        } else {
          setIsRunning(false);
        }
      } else {
        setIsRunning(false);
      }
    }).catch(() => {
      setIsRunning(false);
    });
  }, [agentId]);

  return { currentAgent, businessChallenge, resourcesLoaded, addLog };
}
