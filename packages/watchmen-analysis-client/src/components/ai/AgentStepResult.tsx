import React from 'react';
import { AIAgentStep } from '@/hooks/useAgentEngine';

interface AgentStepResultProps {
  step: AIAgentStep;
}

export const AgentStepResult: React.FC<AgentStepResultProps> = ({ step }) => {
  if (step.status !== 'completed' || !step.result || typeof step.result !== 'object') return null;

  return (
    <div className="mt-3 ml-8 p-3 bg-background/50 rounded-md text-xs space-y-1 overflow-hidden">
      <h4 className="font-semibold mb-1">Step Output:</h4>

      {step.id === 'judgeChallenge' ? (
        <JudgeChallengeResult result={step.result} />
      ) : step.id === 'queryHistory' ? (
        <QueryHistoryResult result={step.result} />
      ) : step.id === 'queryKnowledgeBase' ? (
        <KnowledgeBaseResult result={step.result} />
      ) : step.id === 'buildSimulation' ? (
        <SimulationResult result={step.result} />
      ) : step.id === 'answerBusinessChallenge' ? (
        <AnswerResult result={step.result} />
      ) : step.id === 'generateReport' ? (
        <GenerateReportResult result={step.result} />
      ) : (
        <DefaultResult result={step.result} />
      )}
    </div>
  );
};

// Sub-result components for each step type

const JudgeChallengeResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => {
  const r = result as Record<string, any>;
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <span className="font-medium w-1/3">Challenge Assessment:</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${r.verification_pass ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {r.verification_pass ? 'Suitable for Analysis' : 'Needs Improvement'}
        </span>
      </div>
      {r.reason && <div><span className="font-medium block mb-1">Reason:</span><p className="text-sm">{r.reason}</p></div>}
      {r.clarity && (
        <div className="border-t pt-2">
          <div className="flex items-center mb-1">
            <span className="font-medium">Clarity:</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${r.clarity.is_specific ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
              Score: {r.clarity.specificity_score?.toFixed(1)}/10
            </span>
          </div>
          <p className="text-xs">{r.clarity.specificity_feedback}</p>
        </div>
      )}
      {r.operability && (
        <div className="border-t pt-2">
          <div className="mb-1">
            <span className="font-medium block mb-2">Operability:</span>
            <div className="flex flex-wrap gap-1">
              <span className={`px-2 py-0.5 rounded-full text-xs ${r.operability.is_actionable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.operability.is_actionable ? 'Actionable' : 'Not Actionable'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${r.operability.data_analyzable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.operability.data_analyzable ? 'Analyzable' : 'Not Analyzable'}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${r.operability.strategy_adjustable ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{r.operability.strategy_adjustable ? 'Adjustable' : 'Not Adjustable'}</span>
            </div>
          </div>
          <p className="text-xs">{r.operability.operability_feedback}</p>
        </div>
      )}
      {r.impact && (
        <div className="border-t pt-2">
          <div className="flex items-center mb-1">
            <span className="font-medium">Impact:</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${r.impact.impact_level === 'High' ? 'bg-green-100 text-green-800' : r.impact.impact_level === 'Medium' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
              {r.impact.impact_level} Impact
            </span>
          </div>
          {r.impact.potential_impact_areas?.length > 0 && (
            <div>
              <span className="text-xs font-medium">Potential Impact Areas:</span>
              <ul className="list-disc list-inside pl-2 text-xs">
                {(r.impact.potential_impact_areas as string[]).map((area, i) => <li key={i}>{area}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {r.suggested_challenge && <div><span className="font-medium block mb-1">Suggested Challenge:</span><p className="text-sm">{r.suggested_challenge}</p></div>}
    </div>
  );
};

const QueryHistoryResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => {
  const r = result as Record<string, any>;
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <span className="font-medium w-1/3">Similar Cases Found:</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${r.hasSimilar ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
          {r.hasSimilar ? 'Yes' : 'No'}
        </span>
      </div>
      {r.similarChallenges?.length > 0 && (
        <div>
          <span className="font-medium block mb-1">Similar Challenges:</span>
          <ul className="list-disc list-inside pl-2">
            {(r.similarChallenges as any[]).map((challenge, i) => (
              <li key={i} className="text-xs"><span className="font-medium">{challenge.title}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const KnowledgeBaseResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => {
  const r = result as Record<string, any>;
  return (
    <div className="space-y-2">
      <div>
        <span className="font-medium block mb-1">Knowledge Base Status:</span>
        <p className="text-xs pl-2">{r.hasKnowledgeBase ? 'Available' : 'Not Available'}</p>
      </div>
      {r.knowledgeBaseChallenges?.length > 0 && (
        <div>
          <span className="font-medium block mb-1">Knowledge Base Challenges:</span>
          <ul className="list-disc list-inside pl-2">
            {(r.knowledgeBaseChallenges as string[]).map((challenge, i) => <li key={i} className="text-xs">{challenge}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

const SimulationResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => {
  const r = result as Record<string, any>;
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <span className="font-medium w-1/3">Environment Status:</span>
        <span className={`px-2 py-0.5 rounded-full text-xs ${r.environmentStatus === 'Simulation Environment Built' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {r.environmentStatus}
        </span>
      </div>
      {r.analysisDetails && (
        <div className="border-t pt-2">
          <span className="font-medium block mb-2">Analysis Summary:</span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between"><span>Business Problems:</span><span className="font-medium">{r.analysisDetails.businessProblemsCount}</span></div>
            <div className="flex justify-between"><span>Validated Hypotheses:</span><span className="font-medium text-green-600">{r.analysisDetails.validatedHypothesesCount}</span></div>
            <div className="flex justify-between"><span>Rejected Hypotheses:</span><span className="font-medium text-red-600">{r.analysisDetails.rejectedHypothesesCount}</span></div>
            <div className="flex justify-between"><span>Key Metrics:</span><span className="font-medium">{r.analysisDetails.keyMetricsCount}</span></div>
            <div className="flex justify-between"><span>Insights:</span><span className="font-medium text-blue-600">{r.analysisDetails.insightsCount}</span></div>
            <div className="flex justify-between"><span>Status:</span><span className="font-medium">{r.analysisDetails.analysisStatus}</span></div>
          </div>
        </div>
      )}
      {r.challenge && (
        <div className="border-t pt-2">
          <span className="font-medium block mb-1">Enhanced Challenge:</span>
          <p className="text-xs">{r.challenge.title}</p>
          {r.challenge.problems?.length > 0 && <p className="text-xs text-muted-foreground mt-1">{r.challenge.problems.length} problems identified</p>}
        </div>
      )}
    </div>
  );
};

const AnswerResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => {
  const r = result as Record<string, any>;
  return (
    <div className="space-y-2">
      <div>
        <span className="font-medium block mb-1">Challenge Answer:</span>
        <p className="text-xs pl-2">{r.challengeAnswer}</p>
      </div>
      {r.recommendations?.length > 0 && (
        <div>
          <span className="font-medium block mb-1">Recommendations:</span>
          <ul className="list-disc list-inside pl-2">
            {(r.recommendations as string[]).map((rec, i) => <li key={i} className="text-xs">{rec}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

const GenerateReportResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => {
  const r = result as Record<string, any>;
  return (
    <div className="space-y-2">
      <div>
        <span className="font-medium block mb-1">Summary:</span>
        <p className="text-xs pl-2">{r.summary}</p>
      </div>
      <div className="flex items-center">
        <span className="font-medium w-1/3">Confidence Score:</span>
        <div className="w-2/3 flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-1.5 mr-2">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${r.confidenceScore}%` }}></div>
          </div>
          <span className="text-xs">{r.confidenceScore}%</span>
        </div>
      </div>
      {r.findings?.length > 0 && (
        <div>
          <span className="font-medium block mb-1">Findings:</span>
          <ul className="list-disc list-inside pl-2">
            {(r.findings as string[]).map((finding, i) => <li key={i} className="text-xs">{finding}</li>)}
          </ul>
        </div>
      )}
      {r.recommendations?.length > 0 && (
        <div>
          <span className="font-medium block mb-1">Recommendations:</span>
          <ul className="list-disc list-inside pl-2">
            {(r.recommendations as string[]).map((rec, i) => <li key={i} className="text-xs">{rec}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

const DefaultResult: React.FC<{ result: Record<string, unknown> }> = ({ result }) => (
  <>
    {Object.entries(result).map(([key, value]) => (
      <div key={key} className="flex">
        <span className="font-medium w-1/3 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
        <span className="w-2/3">
          {Array.isArray(value) ? value.join(', ') :
            typeof value === 'object' && value !== null ?
              Object.entries(value).map(([k, v]) => `${k}: ${String(v)}`).join(', ') :
              String(value)}
        </span>
      </div>
    ))}
  </>
);
