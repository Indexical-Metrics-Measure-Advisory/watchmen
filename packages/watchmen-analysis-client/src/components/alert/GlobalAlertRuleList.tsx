import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Bell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { GlobalAlertRule } from '@/model/biAnalysis';
import { GlobalAlertConfigurationModal } from '@/components/bi/GlobalAlertConfigurationModal';
import { Badge } from "@/components/ui/badge";
import { globalAlertService } from '@/services/globalAlertService';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const GlobalAlertRuleList: React.FC = () => {
  const [rules, setRules] = useState<GlobalAlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GlobalAlertRule | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const data = await globalAlertService.getGlobalAlertRules();
      setRules(data);
    } catch (error) {
      console.error("Failed to fetch alert rules", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (rule: GlobalAlertRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      await globalAlertService.deleteGlobalAlertRule(id);
      fetchRules();
    }
  };

  const handleSave = async (rule: GlobalAlertRule) => {
    if (editingRule) {
      await globalAlertService.updateGlobalAlertRule(rule.id, rule);
    } else {
      await globalAlertService.createGlobalAlertRule(rule);
    }
    fetchRules();
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Global Alert Rules</h2>
          <p className="text-muted-foreground">Manage global alert rules and notifications.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" /> New Alert Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <Card key={rule.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium truncate pr-2" title={rule.name}>
                {rule.name || 'Untitled Rule'}
              </CardTitle>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rule.enabled ? 'bg-green-500' : 'bg-gray-300'}`} title={rule.enabled ? 'Active' : 'Disabled'} />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant={rule.priority === 'critical' ? 'destructive' : 'secondary'}>
                    {rule.priority || 'medium'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                {rule.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{rule.description}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-0">
              <Button variant="outline" size="sm" onClick={() => handleEdit(rule)} className="h-8">
                <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(rule.id)} className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
        {rules.length === 0 && !loading && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
            <Bell className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No alert rules found</p>
            <p className="text-sm mt-1">Create a new rule to get started</p>
          </div>
        )}
      </div>
      
      <ErrorBoundary>
        <GlobalAlertConfigurationModal 
          open={isModalOpen} 
          onOpenChange={setIsModalOpen}
          rule={editingRule}
          onSave={handleSave}
        />
      </ErrorBoundary>
    </div>
  );
};
