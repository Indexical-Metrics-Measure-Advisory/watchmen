import React, { useState } from 'react';
import { ActionType } from '@/model/suggestedAction';
import { actionTypeService } from '@/services/actionTypeService';
import { ActionTypeManagement } from '@/components/suggested-action/ActionTypeManagement';
import { ActionTypeModal } from '@/components/suggested-action/ActionTypeModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';

interface ActionTypeConfigurationProps {
  types: ActionType[];
  onTypesChange: (types: ActionType[]) => void;
}

export const ActionTypeConfiguration: React.FC<ActionTypeConfigurationProps> = ({ types, onTypesChange }) => {
  const { t } = useTranslation(['common', 'alertConfig']);
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ActionType | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleAddType = () => {
    setEditingType(null);
    setIsTypeModalOpen(true);
  };

  const handleEditType = (type: ActionType) => {
    setEditingType(type);
    setIsTypeModalOpen(true);
  };

  const handleSaveType = async (type: ActionType) => {
    await actionTypeService.saveActionType(type);
    const updated = await actionTypeService.getActionTypes();
    onTypesChange(updated);
    setIsTypeModalOpen(false);
  };

  const handleDeleteType = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
        await actionTypeService.deleteActionType(deleteId);
        const updated = await actionTypeService.getActionTypes();
        onTypesChange(updated);
        setDeleteId(null);
    }
  };

  const handleToggleType = async (type: ActionType) => {
      await actionTypeService.saveActionType({ ...type, enabled: !type.enabled });
      const updated = await actionTypeService.getActionTypes();
      onTypesChange(updated);
  }

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t('alertConfig:actionTypes.title')}</h2>
          <p className="text-muted-foreground">{t('alertConfig:actionTypes.subtitle')}</p>
        </div>

        <ActionTypeManagement
            types={types}
            onAdd={handleAddType}
            onEdit={handleEditType}
            onDelete={handleDeleteType}
            onToggle={handleToggleType}
        />

        <ActionTypeModal
            open={isTypeModalOpen}
            onOpenChange={setIsTypeModalOpen}
            type={editingType}
            onSave={handleSaveType}
        />

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('alertConfig:actionTypes.deleteTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('alertConfig:actionTypes.deleteDescription')}
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
