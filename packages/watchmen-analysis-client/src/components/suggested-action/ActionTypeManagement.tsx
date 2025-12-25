import React from 'react';
import { ActionType } from '@/model/suggestedAction';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus, Bell, Mail, FileText, Activity } from 'lucide-react';

interface ActionTypeManagementProps {
  types: ActionType[];
  onAdd: () => void;
  onEdit: (type: ActionType) => void;
  onDelete: (id: string) => void;
  onToggle: (type: ActionType) => void;
}

export const ActionTypeManagement: React.FC<ActionTypeManagementProps> = ({
  types,
  onAdd,
  onEdit,
  onDelete,
  onToggle
}) => {
  // Group by Category
  const groupedTypes = types.reduce((acc, type) => {
    if (!acc[type.category]) acc[type.category] = [];
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, ActionType[]>);

  const getIcon = (code: string) => {
    if (code === 'notification') return <Bell className="h-5 w-5 text-blue-500" />;
    if (code === 'email') return <Mail className="h-5 w-5 text-blue-500" />;
    if (code.includes('policy')) return <FileText className="h-5 w-5 text-blue-500" />;
    return <Activity className="h-5 w-5 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Action Type Management</h2>
            <Badge variant="secondary" className="text-sm px-2 py-0.5">{types.length} Types</Badge>
         </div>
         <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" /> Add Type
         </Button>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTypes).map(([category, categoryTypes]) => (
            <div key={category} className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground ml-1">{category}</h3>
                {categoryTypes.map(type => (
                    <Card key={type.id} className="hover:shadow-sm transition-all">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    {getIcon(type.code)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-base">{type.name}</h4>
                                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-slate-50">
                                            {type.code}
                                        </Badge>
                                        {type.requiresApproval && (
                                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
                                                Requires Approval
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <Switch 
                                    checked={type.enabled}
                                    onCheckedChange={() => onToggle(type)}
                                />
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => onEdit(type)} className="h-8 w-8 p-0">
                                        <Edit className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => onDelete(type.id)} className="h-8 w-8 p-0">
                                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        ))}
      </div>
    </div>
  );
};
