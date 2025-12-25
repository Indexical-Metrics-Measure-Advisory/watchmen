import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Settings, List } from 'lucide-react';
import { SuggestedAction, ActionType } from '@/model/suggestedAction';
import { suggestedActionService } from '@/services/suggestedActionService';
import { SuggestedActionList } from '@/components/suggested-action/SuggestedActionList';
import { ActionTypeManagement } from '@/components/suggested-action/ActionTypeManagement';
import { SuggestedActionModal } from '@/components/suggested-action/SuggestedActionModal';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const SuggestedActionManagement: React.FC = () => {
  const [actions, setActions] = useState<SuggestedAction[]>([]);
  const [types, setTypes] = useState<ActionType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View State
  const [currentView, setCurrentView] = useState<'list' | 'types'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<SuggestedAction | null>(null);

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
        suggestedActionService.getActionTypes()
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this action?')) {
      await suggestedActionService.deleteSuggestedAction(id);
      fetchData();
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
  
  // Action Type Handlers
  const handleAddType = () => {
    alert("To be implemented: Open Type Modal");
  };

  const handleEditType = (type: ActionType) => {
    alert(`To be implemented: Edit Type ${type.name}`);
  };

  const handleDeleteType = async (id: string) => {
     if (confirm('Delete this action type?')) {
        await suggestedActionService.deleteActionType(id);
        fetchData();
     }
  };
  
  const handleToggleType = async (type: ActionType) => {
      await suggestedActionService.saveActionType({ ...type, enabled: !type.enabled });
      fetchData();
  }

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
         <div className="flex bg-muted p-1 rounded-lg">
            <Button 
                variant={currentView === 'list' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentView('list')}
            >
                <List className="h-4 w-4 mr-2" /> Action List
            </Button>
            <Button 
                variant={currentView === 'types' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setCurrentView('types')}
            >
                <Settings className="h-4 w-4 mr-2" /> Type Management
            </Button>
         </div>
         
         {currentView === 'list' && (
             <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Action
             </Button>
         )}
      </div>

      {currentView === 'list' ? (
        <>
            <div className="flex items-center gap-4">
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

            <SuggestedActionList 
                actions={filteredActions} 
                types={types}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggleAction}
            />
        </>
      ) : (
        <ActionTypeManagement 
            types={types}
            onAdd={handleAddType}
            onEdit={handleEditType}
            onDelete={handleDeleteType}
            onToggle={handleToggleType}
        />
      )}
      
      <SuggestedActionModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
        action={editingAction}
        types={types}
        onSave={handleSave}
      />
    </div>
  );
};
