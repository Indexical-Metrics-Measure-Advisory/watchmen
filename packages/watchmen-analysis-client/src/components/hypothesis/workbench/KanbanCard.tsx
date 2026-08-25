import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BarChart2, Bell, MessageSquare, MoreHorizontal } from 'lucide-react';
import { HypothesisType } from '@/model/Hypothesis';
import { ageInDays } from './utils';

interface KanbanCardProps {
  hypothesis: HypothesisType;
  onEdit: (id: string) => void;
  onValidate: (id: string) => void;
  onDelete: (id: string) => void;
}

const sourceIconMap = {
  chart: BarChart2,
  alert: Bell,
  chat: MessageSquare,
} as const;

const KanbanCard: React.FC<KanbanCardProps> = ({ hypothesis, onEdit, onValidate, onDelete }) => {
  const { t } = useTranslation('hypothesis');
  const navigate = useNavigate();

  const source = hypothesis.context?.source;
  const SourceIcon = source && source !== 'manual' ? sourceIconMap[source] : undefined;

  const openAnalysis = () => navigate(`/analysis?hypothesis=${hypothesis.id}`);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', hypothesis.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('menu.confirmDelete'))) {
      onDelete(hypothesis.id);
    }
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={openAnalysis}
      className="glass-card rounded-lg p-3 cursor-pointer hover:shadow-glass-hover transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium leading-snug line-clamp-2 flex-1" title={hypothesis.title}>
          {hypothesis.title}
        </div>
        <div onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openAnalysis}>
                {t('menu.openAnalysis')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(hypothesis.id)}>
                {t('menu.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onValidate(hypothesis.id)}>
                {t('menu.validateNow')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                {t('menu.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {hypothesis.metrics.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {hypothesis.metrics.slice(0, 2).map((metric, index) => (
            <Badge key={index} variant="outline" className="bg-background/50 max-w-[140px] truncate text-xs">
              {metric}
            </Badge>
          ))}
          {hypothesis.metrics.length > 2 && (
            <Badge variant="outline" className="bg-background/50 text-xs">
              +{hypothesis.metrics.length - 2}
            </Badge>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {SourceIcon && (
            <span title={t(`source.${source}`)}>
              <SourceIcon className="h-3.5 w-3.5" />
            </span>
          )}
          <span>{t('duePanel.ageDays', { days: ageInDays(hypothesis) })}</span>
        </div>
        <span className="font-medium">{hypothesis.confidence}%</span>
      </div>
    </div>
  );
};

export default KanbanCard;
