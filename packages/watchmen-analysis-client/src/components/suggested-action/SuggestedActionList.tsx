import React from 'react';
import { SuggestedAction, ActionType } from '@/model/suggestedAction';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Bell, Zap, AlertTriangle, CheckCircle, Activity, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SuggestedActionListProps {
  actions: SuggestedAction[];
  types: ActionType[];
  onEdit: (action: SuggestedAction) => void;
  onDelete: (id: string) => void;
  onToggle: (action: SuggestedAction) => void;
}

export const SuggestedActionList: React.FC<SuggestedActionListProps> = ({
  actions,
  types,
  onEdit,
  onDelete,
  onToggle
}) => {
  // Calculate stats
  const total = actions.length;
  const enabled = actions.filter(a => a.enabled).length;
  const highRisk = actions.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length;
  const totalExecutions = actions.reduce((sum, a) => sum + (a.executionCount || 0), 0);

  // Group by Category
  const groupedActions = actions.reduce((acc, action) => {
    const type = types.find(t => t.id === action.typeId);
    const category = type?.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(action);
    return acc;
  }, {} as Record<string, SuggestedAction[]>);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'critical': return 'bg-red-200 text-red-900 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
     switch (priority) {
      case 'high': return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">High Priority</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Medium Priority</Badge>;
      default: return <Badge variant="secondary" className="bg-gray-50 text-gray-600 hover:bg-gray-50">Low Priority</Badge>;
    }
  }

  const getCategoryIcon = (category: string) => {
      if (category.toLowerCase().includes('notification')) return <Bell className="h-5 w-5 text-blue-500"/>;
      if (category.toLowerCase().includes('policy')) return <FileText className="h-5 w-5 text-blue-500"/>;
      return <Zap className="h-5 w-5 text-blue-500"/>;
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Actions</p>
              <h2 className="text-3xl font-bold">{total}</h2>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Zap className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Enabled</p>
              <h2 className="text-3xl font-bold text-green-600">{enabled}</h2>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">High Risk Actions</p>
              <h2 className="text-3xl font-bold text-red-600">{highRisk}</h2>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Executions</p>
              <h2 className="text-3xl font-bold">{totalExecutions}</h2>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Activity className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action List */}
      <div className="space-y-4">
        {Object.entries(groupedActions).map(([category, categoryActions]) => (
          <Card key={category} className="overflow-hidden border-none shadow-sm bg-muted/20">
             <div className="px-6 py-4 flex items-center gap-2">
                {getCategoryIcon(category)}
                <h3 className="font-semibold text-lg">{category}</h3>
                <Badge variant="secondary" className="rounded-full px-2">{categoryActions.length} Actions</Badge>
             </div>
             <div className="space-y-3 px-3 pb-3">
               {categoryActions.map(action => (
                 <Card key={action.id} className="border border-border/50 shadow-sm hover:shadow-md transition-all">
                   <CardContent className="p-5">
                     <div className="flex items-start justify-between">
                       <div className="space-y-2 flex-1">
                         <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <div className="p-2 rounded-full bg-blue-50">
                                <Bell className="h-4 w-4 text-blue-600" />
                            </div>
                            <h4 className="font-semibold text-base">{action.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded border ${getRiskColor(action.riskLevel)}`}>
                              {action.riskLevel === 'low' ? 'Low Risk' : action.riskLevel === 'high' ? 'High Risk' : action.riskLevel === 'critical' ? 'Critical Risk' : 'Medium Risk'}
                            </span>
                            <Badge variant="outline" className="text-xs bg-slate-50">
                                {action.executionMode === 'auto' ? '⚡ Auto Execute' : '🕒 Approval Required'}
                            </Badge>
                            {getPriorityBadge(action.priority)}
                         </div>
                         <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                         
                         <div className="flex items-center gap-2 flex-wrap mt-2">
                            {action.conditions.map((cond, idx) => (
                                <Badge key={idx} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-normal border border-slate-200">
                                    {cond}
                                </Badge>
                            ))}
                         </div>
                         
                         <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground pt-2">
                            {action.expectedOutcome && (
                                <span className="flex items-center gap-1">
                                    <Activity className="h-3 w-3" />
                                    {action.expectedOutcome}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Exec: {action.executionCount}
                            </span>
                            <span className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Success: {action.successRate}%
                            </span>
                            <span>Last: {action.lastExecuted}</span>
                         </div>
                       </div>

                       <div className="flex items-center gap-4 pl-4 border-l ml-4 self-center">
                         <Switch 
                            checked={action.enabled}
                            onCheckedChange={() => onToggle(action)}
                         />
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                               <MoreHorizontal className="h-4 w-4" />
                             </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onEdit(action)}>
                               Edit
                             </DropdownMenuItem>
                             <DropdownMenuItem className="text-red-600" onClick={() => onDelete(action.id)}>
                               Delete
                             </DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               ))}
             </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
