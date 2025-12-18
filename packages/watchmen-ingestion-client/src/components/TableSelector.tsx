
import React from 'react';
import { tableService } from '@/services';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, Sparkles, CheckCircle, Database } from 'lucide-react';

interface TableSelectorProps {
  selectedModule: string;
  selectedModel: string;
  selectedModelName?: string;
  selectedTables: string[];
  onTablesSelect: (tables: string[]) => void;
  aiEnabled: boolean;
  defaultSelectAll?: boolean;
  isSingleSelection?: boolean;
}

const TableSelector: React.FC<TableSelectorProps> = ({
  selectedModule,
  selectedModel,
  selectedModelName,
  selectedTables,
  onTablesSelect,
  aiEnabled,
  defaultSelectAll = false,
  isSingleSelection = false
}) => {
  // Available tables state (normalized shape)
  const [availableTables, setAvailableTables] = React.useState<Array<{ id: string; name: string; description?: string; required?: boolean; aiSuggested?: boolean }>>([]);

  // Fallback mapping for mock/demo
  const fallbackTablesForModel = (moduleId: string, modelIdOrName: string) => {
    const tablesMap: Record<string, { id: string; name: string; description?: string; required?: boolean; aiSuggested?: boolean }[]> = {
      policy_management: [
        { id: 'policy_table', name: 'Policy', description: 'Policy master data', required: true },
        { id: 'endorsement_table', name: 'Endorsement', description: 'Policy endorsements' },
        { id: 'claims_table', name: 'Claims', description: 'Policy claims', aiSuggested: true },
      ],
      claims: [
        { id: 'claim_table', name: 'Claim', description: 'Claim records', required: true },
        { id: 'payment_table', name: 'Payment', description: 'Claim payments' },
      ],
      sales_management: [
        { id: 'customer_table', name: 'Customer', description: 'Customer info', required: true },
        { id: 'order_table', name: 'Order', description: 'Orders' },
        { id: 'invoice_table', name: 'Invoice', description: 'Invoices' },
      ],
    };
    return tablesMap[moduleId] || [];
  };

  // Load tables from service using modelName to match backend `CollectorTableConfig.modelName`
  React.useEffect(() => {
    const load = async () => {
      if (!selectedModule || !selectedModel) {
        setAvailableTables([]);
        return;
      }

      try {
        const all = await tableService.getAllTables();
        const normalized = all
          .filter(t => !selectedModelName || t.modelName === selectedModelName)
          .map(t => ({ 
            id: t.tableName || t.name || t.configId, 
            name: t.name || t.tableName || t.configId, 
            description: t.label 
          }));

        if (normalized.length === 0 && selectedModelName) {
          // Explicit filter by name yielded none; fall back to all tables for visibility
          const fallback = all.map(t => ({ 
            id: t.tableName || t.name || t.configId, 
            name: t.name || t.tableName || t.configId, 
            description: t.label 
          }));
          setAvailableTables(fallback);
        } else if (normalized.length > 0) {
          setAvailableTables(normalized);
        } else {
          // No backend tables; use local fallback by module
          setAvailableTables(fallbackTablesForModel(selectedModule, selectedModel));
        }
      } catch {
        // Backend not available; use local fallback by module
        setAvailableTables(fallbackTablesForModel(selectedModule, selectedModel));
      }
    };
    load();
  }, [selectedModule, selectedModel, selectedModelName]);

  // Auto-select all tables when model changes and defaultSelectAll is true
  React.useEffect(() => {
    if (!defaultSelectAll || isSingleSelection) return;
    if (selectedTables.length > 0) return;
    if (availableTables.length === 0) return;
    onTablesSelect(availableTables.map(t => t.id));
  }, [availableTables]);

  const handleTableToggle = (tableId: string) => {
    if (isSingleSelection) {
      onTablesSelect([tableId]);
    } else {
      const newSelection = selectedTables.includes(tableId)
        ? selectedTables.filter(id => id !== tableId)
        : [...selectedTables, tableId];
      onTablesSelect(newSelection);
    }
  };

  const selectRecommended = () => {
    const recommended = availableTables.filter(table => table.aiSuggested || table.required).map(table => table.id);
    onTablesSelect(recommended);
  };

  const [autoSelectDone, setAutoSelectDone] = React.useState(false);

  React.useEffect(() => {
    if (!defaultSelectAll || isSingleSelection) return;
    if (autoSelectDone) return;
    if (selectedTables.length > 0) return;
    if (availableTables.length === 0) return;
    onTablesSelect(availableTables.map(t => t.id));
    setAutoSelectDone(true);
  }, [availableTables]);

  const selectAll = () => {
    onTablesSelect(availableTables.map(t => t.id));
    setAutoSelectDone(true);
  };

  const clearSelection = () => {
    onTablesSelect([]);
    setAutoSelectDone(true);
  };

  if (!selectedModule || !selectedModel) {
    return (
      <Card className="p-8 text-center bg-gray-50 border-dashed">
        <Table className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Please select a module and model first to see available tables</p>
      </Card>
    );
  }

  if (availableTables.length === 0) {
    return (
      <Card className="p-6 text-center bg-yellow-50 border-yellow-200">
        <Database className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-yellow-800">No tables available for the selected model</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-gray-600">
          {isSingleSelection 
            ? "Select the base table for CDC change tracking" 
            : "Select base tables for CDC change tracking. Multiple selection supported"}
        </p>
        {!isSingleSelection && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
            <Button variant="outline" size="sm" onClick={clearSelection}>Clear Selection</Button>
            {aiEnabled && (
              <Button variant="outline" size="sm" onClick={selectRecommended} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Select AI Recommended
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availableTables.map((table) => (
          <Card
            key={table.id}
            className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
              selectedTables.includes(table.id)
                ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200'
                : 'hover:border-gray-300'
            }`}
            onClick={() => handleTableToggle(table.id)}
          >
            <div className="flex items-start gap-3">
              {isSingleSelection ? (
                <div className={`mt-1 h-4 w-4 rounded-full border border-primary ${selectedTables.includes(table.id) ? 'bg-primary' : 'bg-transparent'}`} />
              ) : (
                <Checkbox
                  checked={selectedTables.includes(table.id)}
                  onChange={() => handleTableToggle(table.id)}
                  className="mt-1"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900">{table.name}</h4>
                  <div className="flex gap-1">
                    {table.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {aiEnabled && table.aiSuggested && (
                      <Badge variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{table.description}</p>
              </div>
              {selectedTables.includes(table.id) && (
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedTables.length > 0 && (
        <Card className="p-3 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {selectedTables.length} table{selectedTables.length > 1 ? 's' : ''} selected
            </span>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TableSelector;
