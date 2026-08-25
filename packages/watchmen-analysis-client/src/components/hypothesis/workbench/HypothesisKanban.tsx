import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HypothesisType } from '@/model/Hypothesis';
import KanbanCard from './KanbanCard';
import { HypothesisStatus, hypothesisStatusConfig, hypothesisStatuses } from './utils';
import { cn } from '@/lib/utils';

interface HypothesisKanbanProps {
  hypotheses: HypothesisType[];
  onMoveHypothesis: (id: string, status: HypothesisStatus) => void;
  onEdit: (id: string) => void;
  onValidate: (id: string) => void;
  onDelete: (id: string) => void;
}

const HypothesisKanban: React.FC<HypothesisKanbanProps> = ({
  hypotheses,
  onMoveHypothesis,
  onEdit,
  onValidate,
  onDelete,
}) => {
  const { t } = useTranslation('hypothesis');
  const [dragOverStatus, setDragOverStatus] = useState<HypothesisStatus | null>(null);

  const handleDrop = (status: HypothesisStatus) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverStatus(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id) {
      return;
    }
    const hypothesis = hypotheses.find(h => h.id === id);
    if (hypothesis && hypothesis.status !== status) {
      onMoveHypothesis(id, status);
    }
  };

  const handleDragOver = (status: HypothesisStatus) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {hypothesisStatuses.map(status => {
        const columnHypotheses = hypotheses
          .filter(h => h.status === status)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return (
          <div
            key={status}
            onDragOver={handleDragOver(status)}
            onDragLeave={() => setDragOverStatus(current => current === status ? null : current)}
            onDrop={handleDrop(status)}
            className={cn(
              'rounded-lg border bg-muted/30 p-3 min-h-[240px] transition-colors',
              dragOverStatus === status && 'border-primary bg-primary/5'
            )}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className={cn('h-2.5 w-2.5 rounded-full', hypothesisStatusConfig[status].dot)} />
                <span className="text-sm font-semibold">{t(`columns.${status}`)}</span>
              </div>
              <span className="text-xs text-muted-foreground">{columnHypotheses.length}</span>
            </div>

            <div className="space-y-2">
              {columnHypotheses.map(hypothesis => (
                <KanbanCard
                  key={hypothesis.id}
                  hypothesis={hypothesis}
                  onEdit={onEdit}
                  onValidate={onValidate}
                  onDelete={onDelete}
                />
              ))}
              {columnHypotheses.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8">
                  {t('empty.title')}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default HypothesisKanban;
