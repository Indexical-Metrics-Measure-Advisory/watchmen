import { useState, useRef } from 'react';
import { SemanticModel, SemanticModelEntity, SemanticModelMeasure, SemanticModelDimension } from '@/model/semanticModel';

const EMPTY_FORM: SemanticModel = {
  id: 'fake',
  name: '',
  description: '',
  defaults: { agg_time_dimension: '' },
  node_relation: {
    alias: '',
    schema_name: '',
    database: '',
    relation_name: ''
  },
  primary_entity: null,
  entities: [],
  measures: [],
  dimensions: [],
  topicId: '',
  sourceType: 'topic',
  label: null,
  metadata: null,
  config: { meta: {} }
};

export function useSemanticModelForm() {
  const [formData, setFormData] = useState<SemanticModel>({ ...EMPTY_FORM });
  const [editingModel, setEditingModel] = useState<SemanticModel | null>(null);
  const dimensionsEndRef = useRef<HTMLDivElement>(null);
  const measuresEndRef = useRef<HTMLDivElement>(null);

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
  };

  const loadModelForEdit = (model: SemanticModel) => {
    setEditingModel(model);
    setFormData({ ...model });
  };

  const clearEditing = () => {
    setEditingModel(null);
    resetForm();
  };

  // Entity CRUD
  const addEntity = () => {
    setFormData(prev => ({
      ...prev,
      entities: [...prev.entities, {
        name: '',
        description: null,
        type: 'primary' as const,
        role: null,
        expr: '',
        metadata: null,
        label: null
      }]
    }));
  };

  const removeEntity = (index: number) => {
    setFormData(prev => ({
      ...prev,
      entities: prev.entities.filter((_, i) => i !== index)
    }));
  };

  const updateEntity = (index: number, field: keyof SemanticModelEntity, value: SemanticModelEntity[keyof SemanticModelEntity]) => {
    setFormData(prev => ({
      ...prev,
      entities: prev.entities.map((entity, i) =>
        i === index ? { ...entity, [field]: value } : entity
      )
    }));
  };

  // Measure CRUD
  const addMeasure = () => {
    setFormData(prev => ({
      ...prev,
      measures: [...prev.measures, {
        name: '',
        agg: 'count' as const,
        description: '',
        create_metric: false,
        expr: '',
        agg_params: null,
        metadata: null,
        non_additive_dimension: null,
        agg_time_dimension: null,
        label: null
      }]
    }));
    setTimeout(() => {
      measuresEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeMeasure = (index: number) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.filter((_, i) => i !== index)
    }));
  };

  const updateMeasure = (index: number, field: keyof SemanticModelMeasure, value: SemanticModelMeasure[keyof SemanticModelMeasure]) => {
    setFormData(prev => ({
      ...prev,
      measures: prev.measures.map((measure, i) =>
        i === index ? { ...measure, [field]: value } : measure
      )
    }));
  };

  // Dimension CRUD
  const addDimension = () => {
    setFormData(prev => ({
      ...prev,
      dimensions: [...prev.dimensions, {
        name: '',
        description: null,
        type: 'time' as const,
        is_partition: false,
        type_params: {
          time_granularity: 'day',
          validity_params: null
        },
        expr: '',
        metadata: null,
        label: null
      }]
    }));
    setTimeout(() => {
      dimensionsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeDimension = (index: number) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.filter((_, i) => i !== index)
    }));
  };

  const updateDimension = (index: number, field: keyof SemanticModelDimension, value: SemanticModelDimension[keyof SemanticModelDimension]) => {
    setFormData(prev => ({
      ...prev,
      dimensions: prev.dimensions.map((dimension, i) =>
        i === index ? { ...dimension, [field]: value } : dimension
      )
    }));
  };

  const timeDimensionOptions = Array.from(
    new Set(
      formData.dimensions
        .filter(dimension => dimension.type === 'time')
        .map(dimension => (dimension.name || '').trim())
        .filter(name => !!name)
    )
  );

  return {
    formData,
    setFormData,
    editingModel,
    resetForm,
    loadModelForEdit,
    clearEditing,
    addEntity,
    removeEntity,
    updateEntity,
    addMeasure,
    removeMeasure,
    updateMeasure,
    addDimension,
    removeDimension,
    updateDimension,
    timeDimensionOptions,
    dimensionsEndRef,
    measuresEndRef
  };
}
