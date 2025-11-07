
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Table, Sparkles, CheckCircle, Database } from 'lucide-react';

interface TableSelectorProps {
  selectedModule: string;
  selectedModel: string;
  selectedTables: string[];
  onTablesSelect: (tables: string[]) => void;
  aiEnabled: boolean;
}

const TableSelector: React.FC<TableSelectorProps> = ({
  selectedModule,
  selectedModel,
  selectedTables,
  onTablesSelect,
  aiEnabled
}) => {
  const getTablesForModel = (moduleId: string, modelId: string) => {
    const tableMappings: Record<string, Record<string, any[]>> = {
      policy_management: {
        policy: [
          { id: 'policies', name: 'Policies', description: 'Main policy information', aiSuggested: true, required: true },
          { id: 'policy_holders', name: 'Policy Holders', description: 'Customer policy holder data', aiSuggested: true, required: false },
          { id: 'premiums', name: 'Premiums', description: 'Premium calculation data', aiSuggested: false, required: false },
          { id: 'coverage_details', name: 'Coverage Details', description: 'Detailed coverage information', aiSuggested: true, required: false }
        ],
        quote: [
          { id: 'quotes', name: 'Quotes', description: 'Quote request information', aiSuggested: true, required: true },
          { id: 'quote_items', name: 'Quote Items', description: 'Individual quote line items', aiSuggested: true, required: false },
          { id: 'underwriting', name: 'Underwriting', description: 'Underwriting assessment data', aiSuggested: false, required: false }
        ]
      },
      claims: {
        claim: [
          { id: 'claims', name: 'Claims', description: 'Main claim records', aiSuggested: true, required: true },
          { id: 'claim_details', name: 'Claim Details', description: 'Detailed claim information', aiSuggested: true, required: false },
          { id: 'documents', name: 'Documents', description: 'Claim supporting documents', aiSuggested: false, required: false },
          { id: 'adjusters', name: 'Adjusters', description: 'Claim adjuster assignments', aiSuggested: false, required: false }
        ]
      },
      sales_management: {
        customer: [
          { id: 'customers', name: 'Customers', description: 'Customer master data', aiSuggested: true, required: true },
          { id: 'customer_contacts', name: 'Customer Contacts', description: 'Customer contact information', aiSuggested: true, required: false },
          { id: 'customer_history', name: 'Customer History', description: 'Customer interaction history', aiSuggested: false, required: false }
        ]
      }
    };

    return tableMappings[moduleId]?.[modelId] || [];
  };

  const tables = getTablesForModel(selectedModule, selectedModel);

  const handleTableToggle = (tableId: string) => {
    const newSelection = selectedTables.includes(tableId)
      ? selectedTables.filter(id => id !== tableId)
      : [...selectedTables, tableId];
    onTablesSelect(newSelection);
  };

  const selectRecommended = () => {
    const recommended = tables.filter(table => table.aiSuggested || table.required).map(table => table.id);
    onTablesSelect(recommended);
  };

  if (!selectedModule || !selectedModel) {
    return (
      <Card className="p-8 text-center bg-gray-50 border-dashed">
        <Table className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Please select a module and model first to see available tables</p>
      </Card>
    );
  }

  if (tables.length === 0) {
    return (
      <Card className="p-6 text-center bg-yellow-50 border-yellow-200">
        <Database className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
        <p className="text-yellow-800">No tables available for the selected model</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {aiEnabled && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">Select tables to include in your data extraction</p>
          <Button
            variant="outline"
            size="sm"
            onClick={selectRecommended}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Select AI Recommended
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {tables.map((table) => (
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
              <Checkbox
                checked={selectedTables.includes(table.id)}
                onChange={() => handleTableToggle(table.id)}
                className="mt-1"
              />
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
