import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, BarChart3, Users, Tags, Info } from 'lucide-react';
import { SemanticModel, SemanticModelNodeRelation } from '@/model/semanticModel';
import { Topic } from '@/services/topicService';
import { useSemanticModelForm } from '@/hooks/useSemanticModelForm';
import { useAutoGenerate } from '@/hooks/useAutoGenerate';
import { useTranslation } from 'react-i18next';

const HelpTooltip = ({ content }: { content: string }) => (
  <span className="inline-flex ml-1" title={content}>
    <Info size={13} className="text-muted-foreground cursor-help" />
  </span>
);

interface SemanticModelFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  editingModel?: SemanticModel | null;
  topics: Topic[];
  isTopicsLoading: boolean;
  isLoading: boolean;
  onSubmit: () => Promise<void>;
  toast: (options: { title: string; description?: string; variant?: 'destructive' | 'default' }) => void;
}

const TopicSelector: React.FC<{
  topicId: string;
  topics: Topic[];
  isTopicsLoading: boolean;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ topicId, topics, isTopicsLoading, disabled, onValueChange, t }) => (
  <Select
    value={topicId || ''}
    onValueChange={onValueChange}
    disabled={disabled || isTopicsLoading}
  >
    <SelectTrigger>
      <SelectValue placeholder={isTopicsLoading ? t('semanticModel:form.loadingTopics') : t('semanticModel:form.selectTopic')}>
        {topicId && topics.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="truncate">{topics.find(tp => tp.id === topicId)?.name || topicId}</span>
            <Badge variant="outline" className="text-xs">
              {topics.find(tp => tp.id === topicId)?.type}
            </Badge>
          </div>
        ) : null}
      </SelectValue>
    </SelectTrigger>
    <SelectContent className="max-w-md max-h-80">
      {isTopicsLoading ? (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-muted-foreground">{t('semanticModel:form.loadingTopics')}</span>
          </div>
        </div>
      ) : topics.length === 0 ? (
        <div className="p-4 text-center">
          <div className="text-sm text-muted-foreground">{t('semanticModel:form.noTopicsAvailable')}</div>
          <div className="text-xs text-muted-foreground mt-1">{t('semanticModel:form.checkDataSourceConfig')}</div>
        </div>
      ) : (
        topics.map((topic) => (
          <SelectItem key={topic.id} value={topic.id} className="p-0">
            <div className="w-full p-3 space-y-2 hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate" title={topic.name}>{topic.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">ID: {topic.id}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Badge variant="default" className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors">{topic.type}</Badge>
                  <Badge variant="outline" className="text-xs px-2 py-0.5 border-green-200 text-green-700 hover:bg-green-50 transition-colors">{topic.classification}</Badge>
                </div>
              </div>
              {topic.description && (
                <div className="border-t border-border/50 pt-2">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{topic.description}</p>
                </div>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                  {t('semanticModel:form.kind')}: {topic.kind}
                </span>
              </div>
            </div>
          </SelectItem>
        ))
      )}
    </SelectContent>
  </Select>
);

const DbConnectionFields: React.FC<{
  nodeRelation: SemanticModelNodeRelation;
  onChange: (updated: Partial<SemanticModelNodeRelation>) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ nodeRelation, onChange, t }) => (
  <>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="col-span-2">
        <Label htmlFor="datasource-type">{t('semanticModel:form.databaseType')}</Label>
        <Select
          value={nodeRelation.databaseType || 'pgsql'}
          onValueChange={(value) => onChange({ databaseType: value as SemanticModelNodeRelation['databaseType'] })}
        >
          <SelectTrigger id="datasource-type">
            <SelectValue placeholder={t('semanticModel:form.selectDatabaseType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pgsql">PostgreSQL</SelectItem>
            <SelectItem value="snowflake">Snowflake</SelectItem>
            <SelectItem value="oracle">Oracle</SelectItem>
            <SelectItem value="mysql">MySQL</SelectItem>
            <SelectItem value="mssql">SQL Server</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mb-4 p-4 border rounded-md bg-muted/20">
      <h5 className="col-span-2 text-xs font-semibold uppercase text-muted-foreground mb-2">{t('semanticModel:form.connectionDetails')}</h5>

      {nodeRelation.databaseType === 'snowflake' ? (
        <>
          <div>
            <Label htmlFor="datasource-account">{t('semanticModel:form.account')}</Label>
            <Input id="datasource-account" value={nodeRelation.account || ''} onChange={(e) => onChange({ account: e.target.value })} placeholder="e.g. xy12345.us-east-1" />
          </div>
          <div>
            <Label htmlFor="datasource-warehouse">{t('semanticModel:form.warehouse')}</Label>
            <Input id="datasource-warehouse" value={nodeRelation.warehouse || ''} onChange={(e) => onChange({ warehouse: e.target.value })} placeholder={t('semanticModel:form.warehousePlaceholder')} />
          </div>
          <div className="col-span-2">
            <Label htmlFor="datasource-role">{t('semanticModel:form.role')}</Label>
            <Input id="datasource-role" value={nodeRelation.role || ''} onChange={(e) => onChange({ role: e.target.value })} placeholder={t('semanticModel:form.rolePlaceholder')} />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label htmlFor="datasource-host">{t('semanticModel:form.host')}</Label>
            <Input id="datasource-host" value={nodeRelation.host || ''} onChange={(e) => onChange({ host: e.target.value })} placeholder={t('semanticModel:form.hostPlaceholder')} />
          </div>
          <div>
            <Label htmlFor="datasource-port">{t('semanticModel:form.port')}</Label>
            <Input id="datasource-port" type="number" value={nodeRelation.port || ''} onChange={(e) => onChange({ port: parseInt(e.target.value) || undefined })} placeholder={t('semanticModel:form.portPlaceholder')} />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="datasource-username">{t('semanticModel:form.username')}</Label>
        <Input id="datasource-username" value={nodeRelation.username || ''} onChange={(e) => onChange({ username: e.target.value })} placeholder={t('semanticModel:form.usernamePlaceholder')} />
      </div>
      <div>
        <Label htmlFor="datasource-password">{t('semanticModel:form.password')}</Label>
        <Input id="datasource-password" type="password" value={nodeRelation.password || ''} onChange={(e) => onChange({ password: e.target.value })} placeholder={t('semanticModel:form.passwordPlaceholder')} />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <h5 className="col-span-2 text-xs font-semibold uppercase text-muted-foreground mb-2">{t('semanticModel:form.objectIdentification')}</h5>
      <div>
        <Label htmlFor="datasource-database">{t('semanticModel:form.databaseName')}</Label>
        <Input id="datasource-database" value={nodeRelation.database} onChange={(e) => onChange({ database: e.target.value })} placeholder={t('semanticModel:form.databaseNamePlaceholder')} />
      </div>
      <div>
        <Label htmlFor="datasource-schema">{t('semanticModel:form.schemaName')}</Label>
        <Input id="datasource-schema" value={nodeRelation.schema_name} onChange={(e) => onChange({ schema_name: e.target.value })} placeholder={t('semanticModel:form.schemaNamePlaceholder')} />
      </div>
      <div>
        <Label htmlFor="datasource-alias">{t('semanticModel:form.tableAlias')}</Label>
        <Input id="datasource-alias" value={nodeRelation.alias} onChange={(e) => onChange({ alias: e.target.value })} placeholder={t('semanticModel:form.tableAliasPlaceholder')} />
      </div>
      <div>
        <Label htmlFor="datasource-relation">{t('semanticModel:form.relationName')}</Label>
        <Input id="datasource-relation" value={nodeRelation.relation_name} onChange={(e) => onChange({ relation_name: e.target.value })} placeholder={t('semanticModel:form.relationNamePlaceholder')} />
      </div>
    </div>
  </>
);

const EntityTab: React.FC<{
  formData: SemanticModel;
  addEntity: () => void;
  removeEntity: (index: number) => void;
  updateEntity: (index: number, field: keyof import('@/model/semanticModel').SemanticModelEntity, value: import('@/model/semanticModel').SemanticModelEntity[keyof import('@/model/semanticModel').SemanticModelEntity]) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ formData, addEntity, removeEntity, updateEntity, t }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-medium">{t('semanticModel:form.entityConfig')}</h4>
      <Button onClick={addEntity} size="sm">
        <Plus size={16} className="mr-2" />
        {t('semanticModel:form.addEntity')}
      </Button>
    </div>
    <ScrollArea className="h-[400px] pr-4">
      <Accordion type="single" collapsible className="w-full">
        {formData.entities.map((entity, index) => (
          <AccordionItem key={index} value={`entity-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entity.name || `${t('semanticModel:page.entities')} ${index + 1}`}</span>
                  {entity.type === 'primary' && <Badge variant="default" className="text-xs">{t('semanticModel:form.primary')}</Badge>}
                  {entity.type === 'foreign' && <Badge variant="outline" className="text-xs">{t('semanticModel:form.foreign')}</Badge>}
                </div>
                <span className="text-xs text-muted-foreground font-mono">{entity.expr}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeEntity(index); }} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} className="mr-1" /> {t('semanticModel:form.removeEntity')}
                  </Button>
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.fieldName')}
                    <HelpTooltip content={t('semanticModel:form.help.entityName')} />
                  </Label>
                  <Input value={entity.name} onChange={(e) => updateEntity(index, 'name', e.target.value)} placeholder={t('semanticModel:form.entityNamePlaceholder')} />
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.type')}
                    <HelpTooltip content={t('semanticModel:form.help.entityType')} />
                  </Label>
                  <Select value={entity.type} onValueChange={(value) => updateEntity(index, 'type', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">{t('semanticModel:form.primary')}</SelectItem>
                      <SelectItem value="foreign">{t('semanticModel:form.foreign')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.expression')}
                    <HelpTooltip content={t('semanticModel:form.help.entityExpression')} />
                  </Label>
                  <Input value={entity.expr} onChange={(e) => updateEntity(index, 'expr', e.target.value)} placeholder={t('semanticModel:form.entityExpressionPlaceholder')} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {formData.entities.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('semanticModel:form.noEntities')}</p>
          <Button variant="link" onClick={addEntity}>{t('semanticModel:form.addFirstEntity')}</Button>
        </div>
      )}
    </ScrollArea>
  </div>
);

const MeasureTab: React.FC<{
  formData: SemanticModel;
  addMeasure: () => void;
  removeMeasure: (index: number) => void;
  updateMeasure: (index: number, field: keyof import('@/model/semanticModel').SemanticModelMeasure, value: import('@/model/semanticModel').SemanticModelMeasure[keyof import('@/model/semanticModel').SemanticModelMeasure]) => void;
  autoGenerateMeasures: () => void;
  measuresEndRef: React.RefObject<HTMLDivElement | null>;
  t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ formData, addMeasure, removeMeasure, updateMeasure, autoGenerateMeasures, measuresEndRef, t }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-medium">{t('semanticModel:form.measureConfig')}</h4>
      <Button onClick={addMeasure} size="sm">
        <Plus size={16} className="mr-2" />
        {t('semanticModel:form.addMeasure')}
      </Button>
    </div>
    <ScrollArea className="h-[400px] pr-4">
      <Accordion type="single" collapsible className="w-full">
        {formData.measures.map((measure, index) => (
          <AccordionItem key={index} value={`measure-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{measure.name || `${t('semanticModel:page.measures')} ${index + 1}`}</span>
                  <Badge variant="secondary" className="text-xs uppercase">{measure.agg}</Badge>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{measure.expr}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeMeasure(index); }} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} className="mr-1" /> {t('semanticModel:form.removeMeasure')}
                  </Button>
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.fieldName')}
                    <HelpTooltip content={t('semanticModel:form.help.measureName')} />
                  </Label>
                  <Input value={measure.name} onChange={(e) => updateMeasure(index, 'name', e.target.value)} placeholder={t('semanticModel:form.measureNamePlaceholder')} />
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.aggregationType')}
                    <HelpTooltip content={t('semanticModel:form.help.aggregationType')} />
                  </Label>
                  <Select value={measure.agg} onValueChange={(value) => updateMeasure(index, 'agg', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">{t('semanticModel:form.count')}</SelectItem>
                      <SelectItem value="sum">{t('semanticModel:form.sum')}</SelectItem>
                      <SelectItem value="average">{t('semanticModel:form.average')}</SelectItem>
                      <SelectItem value="count_distinct">{t('semanticModel:form.countDistinct')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.description')}
                    <HelpTooltip content={t('semanticModel:form.help.measureDescription')} />
                  </Label>
                  <Input value={measure.description || ''} onChange={(e) => updateMeasure(index, 'description', e.target.value)} placeholder={t('semanticModel:form.measureDescriptionPlaceholder')} />
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.expression')}
                    <HelpTooltip content={t('semanticModel:form.help.measureExpression')} />
                  </Label>
                  <Input value={measure.expr} onChange={(e) => updateMeasure(index, 'expr', e.target.value)} placeholder={t('semanticModel:form.measureExpressionPlaceholder')} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {formData.measures.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('semanticModel:form.noMeasures')}</p>
          <Button variant="link" onClick={autoGenerateMeasures}>{t('semanticModel:form.autoGenerateMeasure')}</Button>
        </div>
      )}
      <div ref={measuresEndRef} />
    </ScrollArea>
  </div>
);

const DimensionTab: React.FC<{
  formData: SemanticModel;
  addDimension: () => void;
  removeDimension: (index: number) => void;
  updateDimension: (index: number, field: keyof import('@/model/semanticModel').SemanticModelDimension, value: import('@/model/semanticModel').SemanticModelDimension[keyof import('@/model/semanticModel').SemanticModelDimension]) => void;
  autoGenerateDimensions: () => void;
  dimensionsEndRef: React.RefObject<HTMLDivElement | null>;
  t: (key: string, options?: Record<string, unknown>) => string;
}> = ({ formData, addDimension, removeDimension, updateDimension, autoGenerateDimensions, dimensionsEndRef, t }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-medium">{t('semanticModel:form.dimensionConfig')}</h4>
      <Button onClick={addDimension} size="sm">
        <Plus size={16} className="mr-2" />
        {t('semanticModel:form.addDimension')}
      </Button>
    </div>
    <ScrollArea className="h-[400px] pr-4">
      <Accordion type="single" collapsible className="w-full">
        {formData.dimensions.map((dimension, index) => (
          <AccordionItem key={index} value={`dimension-${index}`}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{dimension.name || `${t('semanticModel:page.dimensions')} ${index + 1}`}</span>
                  <Badge variant="outline" className="text-xs capitalize">{dimension.type}</Badge>
                </div>
                <span className="text-xs text-muted-foreground font-mono">{dimension.expr}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 pb-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeDimension(index); }} className="text-destructive hover:text-destructive">
                    <Trash2 size={14} className="mr-1" /> {t('semanticModel:form.removeDimension')}
                  </Button>
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.fieldName')}
                    <HelpTooltip content={t('semanticModel:form.help.dimensionName')} />
                  </Label>
                  <Input value={dimension.name} onChange={(e) => updateDimension(index, 'name', e.target.value)} placeholder={t('semanticModel:form.dimensionNamePlaceholder')} />
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.type')}
                    <HelpTooltip content={t('semanticModel:form.help.dimensionType')} />
                  </Label>
                  <Select value={dimension.type} onValueChange={(value) => updateDimension(index, 'type', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time">{t('semanticModel:form.time')}</SelectItem>
                      <SelectItem value="categorical">{t('semanticModel:form.categorical')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1 mb-1">
                    {t('semanticModel:form.expression')}
                    <HelpTooltip content={t('semanticModel:form.help.dimensionExpression')} />
                  </Label>
                  <Input value={dimension.expr} onChange={(e) => updateDimension(index, 'expr', e.target.value)} placeholder={t('semanticModel:form.dimensionExpressionPlaceholder')} />
                </div>
                {dimension.type === 'time' && (
                  <div>
                    <Label className="flex items-center gap-1 mb-1">
                      {t('semanticModel:form.timeGranularity')}
                      <HelpTooltip content={t('semanticModel:form.help.dimensionGranularity')} />
                    </Label>
                    <Select
                      value={dimension.type_params?.time_granularity || 'day'}
                      onValueChange={(value) => updateDimension(index, 'type_params', {
                        ...dimension.type_params,
                        time_granularity: value
                      })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="day">{t('semanticModel:form.day')}</SelectItem>
                        <SelectItem value="week">{t('semanticModel:form.week')}</SelectItem>
                        <SelectItem value="month">{t('semanticModel:form.month')}</SelectItem>
                        <SelectItem value="quarter">{t('semanticModel:form.quarter')}</SelectItem>
                        <SelectItem value="year">{t('semanticModel:form.year')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {formData.dimensions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Tags className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>{t('semanticModel:form.noDimensions')}</p>
          <Button variant="link" onClick={autoGenerateDimensions}>{t('semanticModel:form.autoGenerateDimension')}</Button>
        </div>
      )}
      <div ref={dimensionsEndRef} />
    </ScrollArea>
  </div>
);

export const SemanticModelFormDialog: React.FC<SemanticModelFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  editingModel,
  topics,
  isTopicsLoading,
  isLoading,
  onSubmit,
  toast
}) => {
  const { t } = useTranslation(['common', 'semanticModel']);
  const isEdit = mode === 'edit';

  const {
    formData, setFormData, resetForm, clearEditing, loadModelForEdit,
    addEntity, removeEntity, updateEntity,
    addMeasure, removeMeasure, updateMeasure,
    addDimension, removeDimension, updateDimension,
    timeDimensionOptions, dimensionsEndRef, measuresEndRef
  } = useSemanticModelForm();

  const { autoGenerateMeasures, autoGenerateDimensions } = useAutoGenerate({
    formData, setFormData, topics, toast, measuresEndRef, dimensionsEndRef, t
  });

  // Load model data for edit / reset form for create when dialog opens
  React.useEffect(() => {
    if (open && isEdit && editingModel) {
      loadModelForEdit(editingModel);
    } else if (open && !isEdit) {
      resetForm();
    }
  }, [open, isEdit, editingModel]);

  const handleNodeRelationChange = (updated: Partial<SemanticModelNodeRelation>) => {
    setFormData(prev => ({
      ...prev,
      node_relation: { ...prev.node_relation, ...updated }
    }));
  };

  const handleSubmit = async () => {
    await onSubmit();
  };

  const handleClose = (newOpen: boolean) => {
    if (!newOpen) {
      if (isEdit) clearEditing();
      else resetForm();
    }
    onOpenChange(newOpen);
  };

  const hasSelectedDataSource = formData.sourceType === 'topic'
    ? Boolean(formData.topicId)
    : Boolean(formData.node_relation.relation_name?.trim());

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('semanticModel:dialog.editTitle') : t('semanticModel:dialog.createTitle')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('semanticModel:dialog.editDescription') : t('semanticModel:dialog.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">{t('semanticModel:page.tabs.basic')}</TabsTrigger>
            <TabsTrigger value="datasource">{t('semanticModel:page.tabs.datasource')}</TabsTrigger>
            <TabsTrigger value="entities">{t('semanticModel:page.tabs.entities')}</TabsTrigger>
            <TabsTrigger value="measures">{t('semanticModel:page.tabs.measures')}</TabsTrigger>
            <TabsTrigger value="dimensions">{t('semanticModel:page.tabs.dimensions')}</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={isEdit ? 'edit-name' : 'name'}>{t('semanticModel:form.modelName')}</Label>
                <Input
                  id={isEdit ? 'edit-name' : 'name'}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('semanticModel:form.modelNamePlaceholder')}
                  disabled={isEdit}
                />
              </div>
              <div>
                <Label htmlFor={isEdit ? 'edit-description' : 'description'}>{t('semanticModel:form.description')}</Label>
                <Input
                  id={isEdit ? 'edit-description' : 'description'}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('semanticModel:form.descriptionPlaceholder')}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="datasource" className="space-y-4">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-4">{t('semanticModel:form.sourceConfiguration')}</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="datasource-sourceType">{t('semanticModel:form.sourceType')}</Label>
                    <Select
                      value={formData.sourceType || 'topic'}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, sourceType: value as 'topic' | 'db_source' }))}
                    >
                      <SelectTrigger><SelectValue placeholder={t('semanticModel:form.selectSourceType')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="topic">{t('semanticModel:form.topic')}</SelectItem>
                        <SelectItem value="db_source">{t('semanticModel:form.directDbSource')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(formData.sourceType || 'topic') === 'topic' && (
                    <div>
                      <Label>{t('semanticModel:form.selectTopic')}</Label>
                      <TopicSelector
                        topicId={formData.topicId}
                        topics={topics}
                        isTopicsLoading={isTopicsLoading}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, topicId: value }))}
                        t={t}
                      />
                    </div>
                  )}
                </div>
              </div>

              {formData.sourceType === 'db_source' && (
                <DbConnectionFields nodeRelation={formData.node_relation} onChange={handleNodeRelationChange} t={t} />
              )}

              <div>
                <h4 className="text-sm font-medium mb-4">{t('semanticModel:form.defaultSettings')}</h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor={isEdit ? 'edit-agg_time_dimension' : 'agg_time_dimension'}>{t('semanticModel:form.defaultTimeDimension')}</Label>
                    <Select
                      value={formData.defaults.agg_time_dimension || undefined}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, defaults: { ...prev.defaults, agg_time_dimension: value } }))}
                      disabled={!hasSelectedDataSource || timeDimensionOptions.length === 0}
                    >
                      <SelectTrigger id={isEdit ? 'edit-agg_time_dimension' : 'agg_time_dimension'}>
                        <SelectValue placeholder={hasSelectedDataSource ? t('semanticModel:form.selectDefaultTimeDimension') : t('semanticModel:form.selectDataSourceFirst')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeDimensionOptions.map(dimensionName => (
                          <SelectItem key={dimensionName} value={dimensionName}>{dimensionName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!hasSelectedDataSource && <p className="text-xs text-muted-foreground mt-1">{t('semanticModel:form.completeDataSourceFirst')}</p>}
                    {hasSelectedDataSource && timeDimensionOptions.length === 0 && <p className="text-xs text-destructive mt-1">{t('semanticModel:form.createTimeDimensionFirst')}</p>}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="entities">
            <EntityTab formData={formData} addEntity={addEntity} removeEntity={removeEntity} updateEntity={updateEntity} t={t} />
          </TabsContent>

          <TabsContent value="measures">
            <MeasureTab formData={formData} addMeasure={addMeasure} removeMeasure={removeMeasure} updateMeasure={updateMeasure} autoGenerateMeasures={autoGenerateMeasures} measuresEndRef={measuresEndRef} t={t} />
          </TabsContent>

          <TabsContent value="dimensions">
            <DimensionTab formData={formData} addDimension={addDimension} removeDimension={removeDimension} updateDimension={updateDimension} autoGenerateDimensions={autoGenerateDimensions} dimensionsEndRef={dimensionsEndRef} t={t} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t('semanticModel:dialog.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? (isEdit ? t('semanticModel:dialog.updating') : t('semanticModel:dialog.creating'))
              : (isEdit ? t('semanticModel:dialog.update') : t('semanticModel:dialog.create'))}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SemanticModelFormDialog;
