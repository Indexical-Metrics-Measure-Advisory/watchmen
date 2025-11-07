import React from 'react';
import { DatabaseEntity, Column } from '@/models/discovery.models';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Database, Key, KeyRound, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EntityDetailsProps {
  entity: DatabaseEntity | null;
}

const EntityDetails: React.FC<EntityDetailsProps> = ({ entity }) => {
  if (!entity) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-500" />
            Entity Details
          </CardTitle>
          <CardDescription>
            Select an entity from the diagram to view its details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-400">
            <p>No entity selected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            {entity.name}
          </CardTitle>
          <Badge variant="outline">{entity.type}</Badge>
        </div>
        <CardDescription>
          {entity.schema}.{entity.name}
          {entity.description && (
            <span className="block mt-1">{entity.description}</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Columns</h4>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Name</TableHead>
                    <TableHead className="w-[30%]">Type</TableHead>
                    <TableHead className="w-[40%]">Attributes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entity.columns.map((column) => (
                    <TableRow key={column.id}>
                      <TableCell className="font-medium flex items-center gap-1 truncate">
                        {column.isPrimaryKey && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Key className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Primary Key</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {column.isForeignKey && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <KeyRound className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Foreign Key</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <span className="truncate">{column.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-600 truncate block">
                          {formatColumnType(column)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {column.isPrimaryKey && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              Primary Key
                            </Badge>
                          )}
                          {column.isForeignKey && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              Foreign Key
                            </Badge>
                          )}
                          {!column.isNullable && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                              Not Null
                            </Badge>
                          )}
                          {column.defaultValue && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
                              Default: {column.defaultValue}
                            </Badge>
                          )}
                        </div>
                        {column.isForeignKey && column.referencedColumn && (
                          <div className="mt-1 text-xs text-gray-500 flex items-center gap-1 truncate">
                            <Info className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">References {column.referencedColumn.tableName}.{column.referencedColumn.columnName}</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          
          {entity.relationships && entity.relationships.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Relationships</h4>
              <div className="space-y-2">
                {entity.relationships.map((rel) => (
                  <div key={rel.id} className="p-2 border rounded-md bg-gray-50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{rel.name || 'Relationship'}</span>
                      <Badge variant="outline">{rel.type}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {rel.sourceEntityId === entity.id ? 'To' : 'From'}: {rel.sourceEntityId === entity.id ? rel.targetEntityId : rel.sourceEntityId}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to format column type display
const formatColumnType = (column: Column): string => {
  let typeStr = column.type.name;
  if (column.type.size) typeStr += `(${column.type.size})`;
  else if (column.type.precision && column.type.scale) {
    typeStr += `(${column.type.precision},${column.type.scale})`;
  }
  return typeStr;
};

export default EntityDetails;