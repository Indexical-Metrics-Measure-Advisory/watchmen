import React, { useState, useEffect } from 'react';
import { ActionType } from '@/model/suggestedAction';
import { actionTypeService } from '@/services/actionTypeService';
import { ActionTypeManagement } from '@/components/suggested-action/ActionTypeManagement';
import { ActionTypeModal } from '@/components/suggested-action/ActionTypeModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const ActionTypeConfiguration: React.FC = () => {
  const [types, setTypes] = useState<ActionType[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ActionType | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const typesData = await actionTypeService.getActionTypes();
      setTypes(typesData);
    } catch (error) {
      console.error("Failed to fetch action types", error);
    } finally {
      setLoading(false);
    }
  };

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
    fetchData();
    setIsTypeModalOpen(false);
  };

  const handleDeleteType = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (deleteId) {
        await actionTypeService.deleteActionType(deleteId);
        fetchData();
        setDeleteId(null);
    }
  };
  
  const handleToggleType = async (type: ActionType) => {
      await actionTypeService.saveActionType({ ...type, enabled: !type.enabled });
      fetchData();
  }

  return (
    <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Action Type Configuration</h2>
          <p className="text-muted-foreground">Define and manage the types of actions available for suggestions.</p>
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
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the action type.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
};