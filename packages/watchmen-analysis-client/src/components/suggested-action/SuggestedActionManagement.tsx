import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { SuggestedAction, ActionType } from '@/model/suggestedAction';
import { suggestedActionService } from '@/services/suggestedActionService';
import { SuggestedActionList } from '@/components/suggested-action/SuggestedActionList';
import { SuggestedActionModal } from '@/components/suggested-action/SuggestedActionModal';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';

interface SuggestedActionManagementProps {
  types: ActionType[];
  onTypesChange: (types: ActionType[]) => void;
}

export const SuggestedActionManagement: React.FC<SuggestedActionManagementProps> = ({ types, onTypesChange }) => {
  const { t } = useTranslation(['common', 'alertConfig']);
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [loading, setLoading] = useState(true);

  // View State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<SuggestedAction | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const actionsData = await suggestedActionService.getSuggestedActions();
      setActions(actionsData);
    } catch (error) {
      console.error("Failed to fetch actions", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingAction(null);
    setIsModalOpen(true);
  };

  const handleEdit = (action: SuggestedAction) => {
    setEditingAction(action);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
        await suggestedActionService.deleteSuggestedAction(deleteId);
        fetchActions();
        setDeleteId(null);
    }
  };

  const handleSave = async (action: SuggestedAction) => {
    await suggestedActionService.saveSuggestedAction(action);
    fetchActions();
    setIsModalOpen(false);
  };

  const handleToggleAction = async (action: SuggestedAction) => {
     await suggestedActionService.saveSuggestedAction({ ...action, enabled: !action.enabled });
     fetchActions();
  };

  // Filter Logic
  const filteredActions = actions.filter(action => {
    const matchesSearch = action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          action.description.toLowerCase().includes(searchQuery.toLowerCase());

    const type = types.find(t => t.id === action.typeId);
    const matchesCategory = categoryFilter === 'all' || type?.category === categoryFilter;

    const matchesRisk = riskFilter === 'all' || action.riskLevel === riskFilter;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  const categories = Array.from(new Set(types.map(t => t.category)));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t('alertConfig:suggestedActions.title')}</h2>
          <p className="text-muted-foreground">{t('alertConfig:suggestedActions.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
         <div className="flex-1 flex items-center gap-4">
            <div className="flex-1">
                <Input
                    placeholder={t('alertConfig:suggestedActions.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('alertConfig:suggestedActions.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('alertConfig:suggestedActions.allCategories')}</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('alertConfig:suggestedActions.allRiskLevels')} />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">{t('alertConfig:suggestedActions.allRiskLevels')}</SelectItem>
                    <SelectItem value="low">{t('alertConfig:suggestedActions.lowRisk')}</SelectItem>
                    <SelectItem value="medium">{t('alertConfig:suggestedActions.mediumRisk')}</SelectItem>
                    <SelectItem value="high">{t('alertConfig:suggestedActions.highRisk')}</SelectItem>
                    <SelectItem value="critical">{t('alertConfig:suggestedActions.criticalRisk')}</SelectItem>
                </SelectContent>
            </Select>
         </div>

         <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> {t('alertConfig:suggestedActions.newAction')}
         </Button>
      </div>

      <SuggestedActionList
        actions={filteredActions}
        types={types}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggleAction}
      />

      <SuggestedActionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        action={editingAction}
        types={types}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('alertConfig:suggestedActions.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('alertConfig:suggestedActions.deleteDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common:cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">{t('common:delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};
