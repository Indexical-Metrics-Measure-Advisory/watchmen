import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from 'lucide-react';
import { SuggestedAction, ActionType } from '@/model/suggestedAction';
import { suggestedActionService } from '@/services/suggestedActionService';
import { actionTypeService } from '@/services/actionTypeService';
import { SuggestedActionList } from '@/components/suggested-action/SuggestedActionList';
import { SuggestedActionModal } from '@/components/suggested-action/SuggestedActionModal';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const SuggestedActionManagement: React.FC = () => {
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [types, setTypes] = useState<ActionType[]>([]);
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
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [actionsData, typesData] = await Promise.all([
        suggestedActionService.getSuggestedActions(),
        actionTypeService.getActionTypes()
      ]);
      setActions(actionsData);
      setTypes(typesData);
    } catch (error) {
      console.error("Failed to fetch data", error);
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
        fetchData();
        setDeleteId(null);
    }
  };

  const handleSave = async (action: SuggestedAction) => {
    await suggestedActionService.saveSuggestedAction(action);
    fetchData();
    setIsModalOpen(false);
  };

  const handleToggleAction = async (action: SuggestedAction) => {
     await suggestedActionService.saveSuggestedAction({ ...action, enabled: !action.enabled });
     fetchData();
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
          <h2 className="text-xl font-bold tracking-tight">Suggested Action Configuration</h2>
          <p className="text-muted-foreground">Configure and manage automated action suggestions for the decision engine.</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
         <div className="flex-1 flex items-center gap-4">
            <div className="flex-1">
                <Input 
                    placeholder="Search action name or description..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Risk Levels</SelectItem>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="medium">Medium Risk</SelectItem>
                    <SelectItem value="high">High Risk</SelectItem>
                    <SelectItem value="critical">Critical Risk</SelectItem>
                </SelectContent>
            </Select>
         </div>
         
         <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Action
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
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the suggested action.
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