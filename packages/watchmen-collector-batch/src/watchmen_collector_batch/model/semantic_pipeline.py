from typing import List, Optional, Union

from watchmen_model.common import OptimisticLock, PipelineId, \
    TenantBasedTuple, TopicId
from watchmen_utilities import ArrayHelper
from watchmen_utilities import ExtendedBaseModel


class SemanticFieldMapping(ExtendedBaseModel):
    kind: Optional[str] = None
    targetFactorId: Optional[str] = None


class SemanticTopicFieldMapping(SemanticFieldMapping):
    sourceTopicId: Optional[str] = None
    sourceFactorId: Optional[str] = None


class SemanticConstantFieldMapping(SemanticFieldMapping):
    value: Optional[str] = None


class SemanticVariableFieldMapping(SemanticFieldMapping):
    variableName: Optional[str] = None
    factorName: Optional[str] = None
    
    
class SemanticSource(ExtendedBaseModel):
    topicId: Optional[str] = None
    factorId: Optional[str] = None
    variableName: Optional[str] = None


def construct_source(source: Optional[Union[dict, SemanticSource]]) -> Optional[SemanticSource]:
    if source is None:
        return None
    elif isinstance(source, SemanticSource):
        return source
    else:
        return SemanticSource(**source)


def construct_sources(sources: Optional[list] = None) -> Optional[List[SemanticSource]]:
    if sources is None:
        return None
    else:
        return ArrayHelper(sources).map(lambda x: construct_source(x)).to_list()
    
    
def construct_mapping(mapping: Optional[Union[dict, SemanticFieldMapping]]) -> Optional[SemanticFieldMapping]:
    if mapping is None:
        return None
    elif isinstance(mapping, SemanticFieldMapping):
        return mapping
    else:
        return SemanticFieldMapping(**mapping)


def construct_mappings(mappings: Optional[list] = None) -> Optional[List[SemanticFieldMapping]]:
    if mappings is None:
        return None
    else:
        return ArrayHelper(mappings).map(lambda x: construct_mapping(x)).to_list()


class SemanticAction(ExtendedBaseModel):
    actionId: Optional[str] = None
    actionType: Optional[str] = None
    targetTopicId: Optional[str] = None
    primaryKey: Optional[List[str]] = None
    mappings: Optional[List[SemanticFieldMapping]] = None
    loopVariableName: Optional[str] = None
    
    def __setattr__(self, name, value):
        if name == 'mappings':
            super().__setattr__(name, construct_mappings(value))
        else:
            super().__setattr__(name, value)


def construct_action(action: Optional[Union[dict, SemanticAction]]) -> Optional[SemanticAction]:
    if action is None:
        return None
    elif isinstance(action, SemanticAction):
        return action
    else:
        return SemanticAction(**action)


def construct_actions(actions: Optional[list] = None) -> Optional[List[SemanticAction]]:
    if actions is None:
        return None
    else:
        return ArrayHelper(actions).map(lambda x: construct_action(x)).to_list()
    
    
class SemanticPipeline(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
    pipelineId: Optional[PipelineId] = None
    topicId: Optional[TopicId] = None
    name: Optional[str] = None
    actions: Optional[List[SemanticAction]] = []
    sources: Optional[List[SemanticSource]] = []
    
    def __setattr__(self, name, value):
        if name == 'actions':
            super().__setattr__(name, construct_actions(value))
        elif name == 'sources':
            super().__setattr__(name, construct_sources(value))
        else:
            super().__setattr__(name, value)
