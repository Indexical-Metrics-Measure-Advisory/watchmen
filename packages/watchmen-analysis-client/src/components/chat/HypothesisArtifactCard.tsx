import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Loader2, CheckCircle2, XCircle, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { hypothesisService } from '@/services/hypothesisService';
import { analysis_service } from '@/services/analysisService';

export interface HypothesisArtifact {
  kind: 'hypothesis';
  hypothesisId?: string;
  draft: { title: string; description: string; metric?: string; analysisMethod?: string };
  state: 'draft' | 'validating' | 'validated' | 'rejected' | 'error';
  confidence?: number;
}

interface HypothesisArtifactCardProps {
  artifact: HypothesisArtifact;
  onStateChange: (next: HypothesisArtifact) => void;
}

const HypothesisArtifactCard: React.FC<HypothesisArtifactCardProps> = ({ artifact, onStateChange }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { draft, state } = artifact;

  const handleCreateAndValidate = async () => {
    const title = draft.title.trim();
    if (!title) return;

    onStateChange({ ...artifact, draft: { ...draft, title }, state: 'validating' });

    try {
      const created = await hypothesisService.createHypothesis({
        title,
        description: draft.description,
        status: 'drafted',
        confidence: 0,
        metrics: draft.metric ? [draft.metric] : [],
        analysisMethod: draft.analysisMethod ?? 'Trend Analysis',
        context: { source: 'chat', metrics: draft.metric ? [draft.metric] : undefined }
      });

      const validatingArtifact: HypothesisArtifact = {
        ...artifact,
        hypothesisId: created.id,
        draft: { ...draft, title },
        state: 'validating'
      };
      onStateChange(validatingArtifact);

      const result = await analysis_service.start_analysis(created.id);

      if (result.hypothesisValidationFlag === true) {
        onStateChange({ ...validatingArtifact, state: 'validated' });
      } else if (result.hypothesisValidationFlag === false) {
        onStateChange({ ...validatingArtifact, state: 'rejected' });
      } else if (result.status === 'validated') {
        onStateChange({ ...validatingArtifact, state: 'validated' });
      } else if (result.status === 'rejected') {
        onStateChange({ ...validatingArtifact, state: 'rejected' });
      } else {
        // Analysis accepted but not conclusive yet (testing / drafted)
        onStateChange({ ...validatingArtifact, state: 'draft' });
        toast({
          title: 'Analysis submitted',
          description: 'Analysis has been submitted, please check back later.'
        });
      }
    } catch (error) {
      console.error('HypothesisArtifactCard - create & validate failed:', error);
      onStateChange({ ...artifact, state: 'error' });
    }
  };

  const header = (
    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
      Hypothesis
      {state === 'validated' && (
        <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100">
          Validated
        </Badge>
      )}
      {state === 'rejected' && (
        <Badge className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100">
          Rejected
        </Badge>
      )}
    </div>
  );

  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3 space-y-2.5">
      {header}

      {(state === 'draft' || state === 'validating') && (
        <>
          <Input
            value={draft.title}
            onChange={(e) => onStateChange({ ...artifact, draft: { ...draft, title: e.target.value } })}
            disabled={state === 'validating'}
            className="h-8 text-sm bg-white dark:bg-slate-900"
          />
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {draft.description}
          </p>
          <div className="flex items-center justify-between gap-2">
            {draft.metric ? (
              <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100">
                {draft.metric}
              </Badge>
            ) : <span />}
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={state === 'validating' || !draft.title.trim()}
              onClick={handleCreateAndValidate}
            >
              {state === 'validating' && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {state === 'validating' ? 'Validating...' : 'Create & Validate'}
            </Button>
          </div>
        </>
      )}

      {(state === 'validated' || state === 'rejected') && (
        <>
          <div className="flex items-center gap-2 text-sm">
            {state === 'validated'
              ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-none" />
              : <XCircle className="w-4 h-4 text-red-500 flex-none" />}
            <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{draft.title}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {typeof artifact.confidence === 'number' && `Confidence: ${artifact.confidence}%`}
            </span>
            {artifact.hypothesisId && (
              <Button
                variant="link"
                size="sm"
                className="h-7 px-0 text-xs text-blue-600 dark:text-blue-400"
                onClick={() => navigate(`/analysis?hypothesis=${artifact.hypothesisId}`)}
              >
                View detailed analysis
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </>
      )}

      {state === 'error' && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-destructive flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 flex-none" />
            Failed to create or validate the hypothesis.
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onStateChange({ ...artifact, state: 'draft' })}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};

export default HypothesisArtifactCard;
