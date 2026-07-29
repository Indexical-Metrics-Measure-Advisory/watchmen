from typing import Optional, List

from watchmen_collector_batch.model.semantic_pipeline import SemanticPipeline, SemanticAction, \
    SemanticSource, SemanticTopicFieldMapping, SemanticConstantFieldMapping, \
    SemanticVariableFieldMapping, SemanticFieldMapping
from watchmen_model.admin import Pipeline, WriteTopicActionType, MappingFactor, SystemActionType, \
    PipelineAction
from watchmen_model.common import ParameterJoint, ParameterExpression, Parameter, TopicFactorParameter, \
    ConstantParameter, VariableParameter


def create_semantic_pipeline(pipeline: Pipeline) -> SemanticPipeline:
    semantic_pipeline = SemanticPipeline(
        pipelineId=pipeline.pipelineId,
        topicId=pipeline.topicId,
        name=pipeline.name,
        tenantId=pipeline.tenantId
    )
    actions: List[SemanticAction] = []
    sources: List[SemanticSource] = []
    if pipeline.stages:
        for stage in pipeline.stages:
            if stage.units:
                for unit in stage.units:
                    if unit.do:
                        for action in unit.do:
                            if action.type == SystemActionType.COPY_TO_MEMORY.value:
                                source = parse_source(action.source, action.variableName)
                                if source:
                                    sources.append(source)
                            else:
                                action = parse_action(action)
                                if action:
                                    if unit.loopVariableName:
                                        action.loopVariableName = unit.loopVariableName
                                    actions.append(action)
    semantic_pipeline.actions = actions
    semantic_pipeline.sources = sources
    return semantic_pipeline


def parse_action(action: PipelineAction) -> Optional[SemanticAction]:
    if action.type == WriteTopicActionType.INSERT_ROW.value:
        semantic_action = SemanticAction(
            actionId=action.actionId,
            actionType=action.type,
            targetTopicId=action.topicId,
            primaryKey=None,
            mappings=parse_mapping(action.mapping)
        )
        return semantic_action
    
    if action.type == WriteTopicActionType.INSERT_OR_MERGE_ROW:
        semantic_action = SemanticAction(
            actionId=action.actionId,
            actionType=action.type,
            targetTopicId=action.topicId,
            primaryKey=parse_by(action.topicId, action.by),
            mappings=parse_mapping(action.mapping)
        )
        return semantic_action
    return None


def parse_by(topic_id: int, joint: ParameterJoint) -> List:
    primary_key = []
    
    def parse_parameter(parameter: TopicFactorParameter):
        if topic_id == parameter.topicId:
            return primary_key.append(parameter.factorId)
        return None
    
    for filter_ in joint.filters:
        if isinstance(filter_, ParameterExpression):
            if isinstance(filter_.left, TopicFactorParameter):
                parse_parameter(filter_.left)
            elif isinstance(filter_.right, TopicFactorParameter):
                parse_parameter(filter_.right)
    return primary_key


def parse_mapping(field_mappings: List[MappingFactor]) -> List[SemanticFieldMapping]:
    semantic_field_mappings = []
    for field_mapping in field_mappings:
        source = field_mapping.source
        if isinstance(source, TopicFactorParameter):
            semantic_field_mapping = SemanticTopicFieldMapping(
                kind="topic",
                sourceTopicId=source.topicId,
                sourceFactorId=source.factorId,
                targetFactorId=field_mapping.factorId
            )
            semantic_field_mappings.append(semantic_field_mapping)
        elif isinstance(source, ConstantParameter):
            semantic_field_mapping = SemanticConstantFieldMapping(
                kind="constant",
                value=source.value,
                targetFactorId=field_mapping.factorId
            )
            semantic_field_mappings.append(semantic_field_mapping)
        elif isinstance(source, VariableParameter):
            semantic_field_mapping = SemanticVariableFieldMapping(
                kind="variable",
                variableName=source.variableName,
                factorName=source.factorName,
                targetFactorId=field_mapping.factorId
            )
            semantic_field_mappings.append(semantic_field_mapping)
    return semantic_field_mappings
            
            

def parse_source(source: Parameter, variable_name: str) -> Optional[SemanticSource]:
    if source.kind == "topic":
        return SemanticSource(
            topicId=source.topicId,
            factorId=source.factorId,
            variableName=variable_name
        )
    else:
        return None
    
