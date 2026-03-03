from logging import getLogger
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Pipeline, PipelineStage, PipelineUnit, PipelineAction
from watchmen_model.admin.pipeline import construct_action, PipelineTriggerType
from watchmen_model.admin.pipeline_action import AggregateArithmetic
from watchmen_model.admin.pipeline_action_write import InsertRowAction, MergeRowAction, InsertOrMergeRowAction, WriteFactorAction, AccumulateMode
from watchmen_model.admin.pipeline_action_read import ReadRowAction, ReadRowsAction, ReadFactorAction, ReadFactorsAction, ExistsAction
from watchmen_model.admin.pipeline_action_delete import DeleteRowAction, DeleteRowsAction
from watchmen_model.admin.pipeline_action_system import AlarmAction, CopyToMemoryAction, WriteToExternalAction
from watchmen_model.common.parameter_and_condition import ParameterComputeType, ParameterExpressionOperator, ParameterJointType
from watchmen_rest import get_admin_principal
from typing import Literal, Union, ForwardRef

router = APIRouter()

logger = getLogger(__name__)

def _format_error(operation: str, error: Exception) -> str:
    message = str(error).strip()
    if not message:
        message = repr(error)
    return f'{operation} failed: {message}'


def get_pipeline_service(principal_service: PrincipalService) -> PipelineService:
    return PipelineService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class CreatePipelineModel(BaseModel):
    name: str = Field(..., description="Name of the pipeline")
    topic_id: str = Field(..., description="ID of the topic this pipeline belongs to")
    type: str = Field("business", description="Type of the pipeline (e.g., business, data-validation)")
    enabled: bool = Field(True, description="Whether the pipeline is enabled")


class CreatePipelineResponse(BaseModel):
    pipelineId: str = Field(..., description="ID of the created pipeline")
    name: str = Field(..., description="Name of the created pipeline")
    status: str = Field("success", description="Status of the operation")


@router.post('/mcp/data_processing/create_pipeline', tags=['mcp-pipeline'], operation_id="create_pipeline",
             response_model=CreatePipelineResponse,
             description="Create a new data processing pipeline (Data Processing Skill).")
async def create_pipeline(request: CreatePipelineModel,
                          principal_service: PrincipalService = Depends(get_admin_principal)) -> CreatePipelineResponse:
    try:
        tenant_id = principal_service.get_tenant_id()
        pipeline_service = get_pipeline_service(principal_service)
        pipeline_service.begin_transaction()
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('create_pipeline.begin_transaction', e))

    try:
        pipeline_type = PipelineTriggerType(request.type) if request.type else PipelineTriggerType.INSERT_OR_MERGE
        pipeline = Pipeline(
            name=request.name,
            topicId=request.topic_id,
            type=pipeline_type,
            stages=[],
            enabled=request.enabled,
            tenantId=tenant_id
        )

        pipeline_service.redress_storable_id(pipeline)

        pipeline_service.create(pipeline)
        pipeline_service.commit_transaction()

        return CreatePipelineResponse(pipelineId=pipeline.pipelineId, name=pipeline.name)
    except ValueError as e:
        pipeline_service.rollback_transaction()
        raise HTTPException(status_code=400, detail=_format_error('create_pipeline', e))
    except HTTPException as e:
        pipeline_service.rollback_transaction()
        raise e
    except Exception as e:
        pipeline_service.rollback_transaction()
        raise HTTPException(status_code=500, detail=_format_error('create_pipeline', e))


def construct_pipeline(data: Dict[str, Any]) -> Pipeline:
    pipeline = Pipeline(**{k: v for k, v in data.items() if k != 'stages'})
    if 'stages' in data:
        stages = []
        for stage_data in data['stages']:
            if isinstance(stage_data, dict):
                stage = PipelineStage(**{k: v for k, v in stage_data.items() if k != 'units'})
                if 'units' in stage_data:
                    units = []
                    for unit_data in stage_data['units']:
                        if isinstance(unit_data, dict):
                            unit = PipelineUnit(**{k: v for k, v in unit_data.items() if k != 'do'})
                            if 'do' in unit_data:
                                unit.do = unit_data['do']
                            units.append(unit)
                        else:
                            units.append(unit_data)
                    stage.units = units
                stages.append(stage)
            else:
                stages.append(stage_data)
        pipeline.stages = stages
    return pipeline


class UpdatePipelineModel(BaseModel):
    pipeline: Dict[str, Any] = Field(..., description="Full pipeline JSON definition")


class UpdatePipelineResponse(BaseModel):
    pipelineId: str = Field(..., description="ID of the updated pipeline")
    name: str = Field(..., description="Name of the updated pipeline")
    enabled: bool = Field(..., description="Enabled status")
    type: str = Field(..., description="Type of the pipeline")
    status: str = Field("success", description="Status of the operation")


@router.post('/mcp/data_processing/update_pipeline', tags=['mcp-pipeline'], operation_id="update_pipeline",
             response_model=UpdatePipelineResponse,
             description="Update an existing data processing pipeline.")
async def update_pipeline(request: UpdatePipelineModel,
                          principal_service: PrincipalService = Depends(get_admin_principal)) -> UpdatePipelineResponse:
    tenant_id = principal_service.get_tenant_id()
    pipeline_service = get_pipeline_service(principal_service)
    pipeline_service.begin_transaction()
    try:
        pipeline_data = request.pipeline
        pipeline_id = pipeline_data.get('pipelineId')
        
        if not pipeline_id:
            raise HTTPException(status_code=400, detail="Pipeline ID is missing in the request body.")

        existing_pipeline = pipeline_service.find_by_id(pipeline_id)
        if not existing_pipeline:
            raise HTTPException(status_code=404, detail=f"Pipeline {pipeline_id} not found.")

        if existing_pipeline.tenantId != tenant_id:
            raise HTTPException(status_code=403, detail=f"Pipeline {pipeline_id} does not belong to current tenant.")

        # Construct full pipeline object
        updated_pipeline = construct_pipeline(pipeline_data)
        
        # Enforce tenantId and other critical fields from existing if needed, or trust request but validate
        # Usually we enforce tenantId
        updated_pipeline.tenantId = tenant_id
        
        # Update
        pipeline_service.update(updated_pipeline)
        pipeline_service.commit_transaction()

        return UpdatePipelineResponse(
            pipelineId=updated_pipeline.pipelineId,
            name=updated_pipeline.name,
            enabled=updated_pipeline.enabled,
            type=updated_pipeline.type,
            status="success"
        )
    except HTTPException as e:
        pipeline_service.rollback_transaction()
        raise e
    except Exception as e:
        pipeline_service.rollback_transaction()
        raise HTTPException(status_code=500, detail=_format_error('update_pipeline', e))


class AddStageModel(BaseModel):
    pipeline_id: str = Field(..., description="ID of the pipeline")
    name: str = Field(..., description="Name of the stage")


class AddStageResponse(BaseModel):
    status: str = Field("success", description="Status of the operation")
    message: str = Field(..., description="Result message")


@router.post('/mcp/data_processing/add_stage', tags=['mcp-pipeline'], operation_id="add_stage",
             response_model=AddStageResponse,
             description="Add a processing stage to an existing pipeline.")
async def add_stage(request: AddStageModel,
                    principal_service: PrincipalService = Depends(get_admin_principal)) -> AddStageResponse:
    try:
        tenant_id = principal_service.get_tenant_id()
        pipeline_service = get_pipeline_service(principal_service)
        pipeline_service.begin_transaction()
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('add_stage.begin_transaction', e))

    try:
        pipeline = pipeline_service.find_by_id(request.pipeline_id)
        if not pipeline:
            raise HTTPException(status_code=404, detail=f"Pipeline {request.pipeline_id} not found.")
        
        if pipeline.tenantId != tenant_id:
             raise HTTPException(status_code=403, detail=f"Pipeline {request.pipeline_id} does not belong to current tenant.")

        current_stages = pipeline.stages or []
        
        # Create new stage
        new_stage = PipelineStage(
            stageId=str(pipeline_service.snowflakeGenerator.next_id()),
            name=request.name,
            units=[]
        )
        
        current_stages.append(new_stage)
        pipeline.stages = current_stages

        # Update
        pipeline_service.update(pipeline)
        pipeline_service.commit_transaction()

        return AddStageResponse(message=f"Added stage '{request.name}' to pipeline {pipeline.name}.")
    except HTTPException as e:
        pipeline_service.rollback_transaction()
        raise e
    except Exception as e:
        pipeline_service.rollback_transaction()
        raise HTTPException(status_code=500, detail=_format_error('add_stage', e))


class AddUnitModel(BaseModel):
    pipeline_id: str = Field(..., description="ID of the pipeline")
    stage_name: str = Field(..., description="Name of the stage to add unit to")
    name: str = Field(..., description="Name of the unit")


class AddUnitResponse(BaseModel):
    unitId: str = Field(..., description="ID of the created unit")
    message: str = Field(..., description="Result message")


@router.post('/mcp/data_processing/add_unit', tags=['mcp-pipeline'], operation_id="add_unit",
             response_model=AddUnitResponse,
             description="Add a processing unit to an existing stage.")
async def add_unit(request: AddUnitModel,
                   principal_service: PrincipalService = Depends(get_admin_principal)) -> AddUnitResponse:
    try:
        tenant_id = principal_service.get_tenant_id()
        pipeline_service = get_pipeline_service(principal_service)
        pipeline_service.begin_transaction()
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('add_unit.begin_transaction', e))

    try:
        pipeline = pipeline_service.find_by_id(request.pipeline_id)
        if not pipeline:
            raise HTTPException(status_code=404, detail=f"Pipeline {request.pipeline_id} not found.")
        
        if pipeline.tenantId != tenant_id:
             raise HTTPException(status_code=403, detail=f"Pipeline {request.pipeline_id} does not belong to current tenant.")

        # Find stage
        stage = next((s for s in (pipeline.stages or []) if s.name == request.stage_name), None)
        if not stage:
            raise HTTPException(status_code=404, detail=f"Stage '{request.stage_name}' not found in pipeline.")

        # Create unit
        unit = PipelineUnit(
            unitId=str(pipeline_service.snowflakeGenerator.next_id()),
            name=request.name,
            do=[]
        )
        
        if stage.units is None:
            stage.units = []
        stage.units.append(unit)

        # Update
        pipeline_service.update(pipeline)
        pipeline_service.commit_transaction()

        return AddUnitResponse(unitId=unit.unitId, message=f"Added unit '{request.name}' to stage '{request.stage_name}'.")
    except HTTPException as e:
        pipeline_service.rollback_transaction()
        raise e
    except Exception as e:
        pipeline_service.rollback_transaction()
        raise HTTPException(status_code=500, detail=_format_error('add_unit', e))


class AddActionModel(BaseModel):
    pipeline_id: str = Field(..., description="ID of the pipeline")
    stage_name: str = Field(..., description="Name of the stage")
    unit_name: str = Field(..., description="Name of the unit")
    action_type: str = Field(..., description="Type of the action (e.g., alarm, copy-to-memory, write-to-external, read-row, write-factor, insert-row, merge-row)")
    action_params: Dict[str, Any] = Field(..., description="Parameters for the action")


class AddActionResponse(BaseModel):
    message: str = Field(..., description="Result message")

#
# @router.post('/mcp/data_processing/add_action', tags=['mcp-action'], operation_id="add_action",
#              response_model=AddActionResponse,
#              description="Add an action to an existing unit.")
# async def add_action(request: AddActionModel,
#                      principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
#     try:
#         tenant_id = principal_service.get_tenant_id()
#         pipeline_service = get_pipeline_service(principal_service)
#         pipeline_service.begin_transaction()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
#
#     try:
#         pipeline = pipeline_service.find_by_id(request.pipeline_id)
#         if not pipeline:
#             raise HTTPException(status_code=404, detail=f"Pipeline {request.pipeline_id} not found.")
#
#         if pipeline.tenantId != tenant_id:
#              raise HTTPException(status_code=403, detail=f"Pipeline {request.pipeline_id} does not belong to current tenant.")
#
#         # Find stage
#         stage = next((s for s in (pipeline.stages or []) if s.name == request.stage_name), None)
#         if not stage:
#             raise HTTPException(status_code=404, detail=f"Stage '{request.stage_name}' not found in pipeline.")
#
#         # Find unit
#         unit = next((u for u in (stage.units or []) if u.name == request.unit_name), None)
#         if not unit:
#             raise HTTPException(status_code=404, detail=f"Unit '{request.unit_name}' not found in stage '{request.stage_name}'.")
#
#         # Construct action
#         action_dict = request.action_params.copy()
#         action_dict['type'] = request.action_type
#         logger.info(f"Constructing action with params: {action_dict}")
#         try:
#             action = construct_action(action_dict)
#         except Exception as e:
#              logger.error(f"Failed to construct action: {e}")
#              raise HTTPException(status_code=400, detail=f"Invalid action parameters: {str(e)}")
#
#         if unit.do is None:
#             unit.do = []
#         unit.do.append(action)
#
#         # Update
#         pipeline_service.update(pipeline)
#         pipeline_service.commit_transaction()
#
#         return AddActionResponse(message=f"Added action '{request.action_type}' to unit '{request.unit_name}'.")
#     except Exception as e:
#         pipeline_service.rollback_transaction()
#         raise HTTPException(status_code=500, detail=str(e))


async def _add_action_internal(pipeline_id: str, stage_name: str, unit_name: str, action: PipelineAction, principal_service: PrincipalService) -> AddActionResponse:
    try:
        tenant_id = principal_service.get_tenant_id()
        pipeline_service = get_pipeline_service(principal_service)
        pipeline_service.begin_transaction()
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('_add_action_internal.begin_transaction', e))

    try:
        pipeline = pipeline_service.find_by_id(pipeline_id)
        if not pipeline:
            raise HTTPException(status_code=404, detail=f"Pipeline {pipeline_id} not found.")
        
        if pipeline.tenantId != tenant_id:
             raise HTTPException(status_code=403, detail=f"Pipeline {pipeline_id} does not belong to current tenant.")

        # Find stage
        stage = next((s for s in (pipeline.stages or []) if s.name == stage_name), None)
        if not stage:
            raise HTTPException(status_code=404, detail=f"Stage '{stage_name}' not found in pipeline.")

        # Find unit
        unit = next((u for u in (stage.units or []) if u.name == unit_name), None)
        if not unit:
            raise HTTPException(status_code=404, detail=f"Unit '{unit_name}' not found in stage '{stage_name}'.")

        if action.actionId is None:
            action.actionId = str(pipeline_service.snowflakeGenerator.next_id())

        if unit.do is None:
            unit.do = []
        unit.do.append(action)

        # Update
        pipeline_service.update(pipeline)
        pipeline_service.commit_transaction()

        return AddActionResponse(message=f"Added action '{action.type}' to unit '{unit_name}'.")
    except HTTPException as e:
        pipeline_service.rollback_transaction()
        raise e
    except Exception as e:
        pipeline_service.rollback_transaction()
        raise HTTPException(status_code=500, detail=_format_error('_add_action_internal', e))


# --- MCP Parameter Models ---

class MCPParameterBase(BaseModel):
    conditional: bool = Field(False, description="Whether the parameter is applied conditionally")
    on: Optional[Dict[str, Any]] = Field(None, description="Condition (ParameterJoint or ParameterExpression) when conditional is true")

class MCPTopicFactorParameter(MCPParameterBase):
    kind: Literal['topic'] = 'topic'
    topicId: str = Field(..., description="ID of the topic")
    factorId: str = Field(..., description="ID of the factor")

class MCPConstantParameter(MCPParameterBase):
    kind: Literal['constant'] = 'constant'
    value: Optional[str] = Field(None, description="Constant value")

class MCPComputedParameter(MCPParameterBase):
    kind: Literal['computed'] = 'computed'
    type: ParameterComputeType = Field(..., description="Computation type")
    parameters: List[Dict[str, Any]] = Field(..., description="List of Parameters (TopicFactor, Constant, or Computed) for computation")

class MCPParameterExpression(BaseModel):
    left: Optional[Dict[str, Any]] = Field(None, description="Left parameter (TopicFactor, Constant, or Computed)")
    operator: ParameterExpressionOperator = ParameterExpressionOperator.EQUALS
    right: Optional[Dict[str, Any]] = Field(None, description="Right parameter (TopicFactor, Constant, or Computed)")

class MCPParameterJoint(BaseModel):
    jointType: ParameterJointType = ParameterJointType.AND
    filters: List[Dict[str, Any]] = Field(..., description="List of Conditions (ParameterExpression or ParameterJoint)")

MCPParameter = Union[MCPTopicFactorParameter, MCPConstantParameter, MCPComputedParameter]
MCPParameterCondition = Union[MCPParameterExpression, MCPParameterJoint]

class MCPMappingFactor(BaseModel):
    factorId: str
    source: MCPParameter
    arithmetic: AggregateArithmetic = AggregateArithmetic.NONE

class MCPInsertOrMergeRowAction(BaseModel):
    type: Literal['insert-or-merge-row'] = 'insert-or-merge-row'
    topicId: str
    mapping: List[MCPMappingFactor]
    by: MCPParameterJoint
    accumulateMode: AccumulateMode = AccumulateMode.STANDARD

class MCPInsertRowAction(BaseModel):
    type: Literal['insert-row'] = 'insert-row'
    topicId: str
    mapping: List[MCPMappingFactor]
    accumulateMode: AccumulateMode = AccumulateMode.STANDARD

class MCPMergeRowAction(BaseModel):
    type: Literal['merge-row'] = 'merge-row'
    topicId: str
    mapping: List[MCPMappingFactor]
    by: MCPParameterJoint
    accumulateMode: AccumulateMode = AccumulateMode.STANDARD

# --- End MCP Parameter Models ---


class AddActionRequestBase(BaseModel):
    pipeline_id: str = Field(..., description="ID of the pipeline")
    stage_name: str = Field(..., description="Name of the stage")
    unit_name: str = Field(..., description="Name of the unit")


# --- Write Actions ---

class AddInsertRowActionRequest(AddActionRequestBase):
    action: MCPInsertRowAction

@router.post('/mcp/data_processing/add_action/insert_row', tags=['mcp-action'], operation_id="add_insert_row_action", response_model=AddActionResponse)
async def add_insert_row_action(request: AddInsertRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    domain_action = construct_action(request.action.dict())
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, domain_action, principal_service)

class AddMergeRowActionRequest(AddActionRequestBase):
    action: MCPMergeRowAction

@router.post('/mcp/data_processing/add_action/merge_row', tags=['mcp-action'], operation_id="add_merge_row_action", response_model=AddActionResponse)
async def add_merge_row_action(request: AddMergeRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    domain_action = construct_action(request.action.dict())
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, domain_action, principal_service)

class AddInsertOrMergeRowActionRequest(AddActionRequestBase):
    action: MCPInsertOrMergeRowAction

@router.post('/mcp/data_processing/add_action/insert_or_merge_row', tags=['mcp-action'], operation_id="add_insert_or_merge_row_action", response_model=AddActionResponse)
async def add_insert_or_merge_row_action(request: AddInsertOrMergeRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    domain_action = construct_action(request.action.dict())
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, domain_action, principal_service)

class AddWriteFactorActionRequest(AddActionRequestBase):
    action: WriteFactorAction

@router.post('/mcp/data_processing/add_action/write_factor', tags=['mcp-action'], operation_id="add_write_factor_action", response_model=AddActionResponse)
async def add_write_factor_action(request: AddWriteFactorActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)


# --- Read Actions ---

class AddReadRowActionRequest(AddActionRequestBase):
    action: ReadRowAction

@router.post('/mcp/data_processing/add_action/read_row', tags=['mcp-action'], operation_id="add_read_row_action", response_model=AddActionResponse)
async def add_read_row_action(request: AddReadRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddReadRowsActionRequest(AddActionRequestBase):
    action: ReadRowsAction

@router.post('/mcp/data_processing/add_action/read_rows', tags=['mcp-action'], operation_id="add_read_rows_action", response_model=AddActionResponse)
async def add_read_rows_action(request: AddReadRowsActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddReadFactorActionRequest(AddActionRequestBase):
    action: ReadFactorAction

@router.post('/mcp/data_processing/add_action/read_factor', tags=['mcp-action'], operation_id="add_read_factor_action", response_model=AddActionResponse)
async def add_read_factor_action(request: AddReadFactorActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddReadFactorsActionRequest(AddActionRequestBase):
    action: ReadFactorsAction

@router.post('/mcp/data_processing/add_action/read_factors', tags=['mcp-action'], operation_id="add_read_factors_action", response_model=AddActionResponse)
async def add_read_factors_action(request: AddReadFactorsActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddExistsActionRequest(AddActionRequestBase):
    action: ExistsAction

@router.post('/mcp/data_processing/add_action/exists', tags=['mcp-action'], operation_id="add_exists_action", response_model=AddActionResponse)
async def add_exists_action(request: AddExistsActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)


# --- Delete Actions ---

class AddDeleteRowActionRequest(AddActionRequestBase):
    action: DeleteRowAction

@router.post('/mcp/data_processing/add_action/delete_row', tags=['mcp-action'], operation_id="add_delete_row_action", response_model=AddActionResponse)
async def add_delete_row_action(request: AddDeleteRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddDeleteRowsActionRequest(AddActionRequestBase):
    action: DeleteRowsAction

@router.post('/mcp/data_processing/add_action/delete_rows', tags=['mcp-action'], operation_id="add_delete_rows_action", response_model=AddActionResponse)
async def add_delete_rows_action(request: AddDeleteRowsActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)


# --- System Actions ---

class AddAlarmActionRequest(AddActionRequestBase):
    action: AlarmAction

@router.post('/mcp/data_processing/add_action/alarm', tags=['mcp-action'], operation_id="add_alarm_action", response_model=AddActionResponse)
async def add_alarm_action(request: AddAlarmActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddCopyToMemoryActionRequest(AddActionRequestBase):
    action: CopyToMemoryAction

@router.post('/mcp/data_processing/add_action/copy_to_memory', tags=['mcp-action'], operation_id="add_copy_to_memory_action", response_model=AddActionResponse)
async def add_copy_to_memory_action(request: AddCopyToMemoryActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddWriteToExternalActionRequest(AddActionRequestBase):
    action: WriteToExternalAction

@router.post('/mcp/data_processing/add_action/write_to_external', tags=['mcp-action'], operation_id="add_write_to_external_action", response_model=AddActionResponse)
async def add_write_to_external_action(request: AddWriteToExternalActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)



class PipelineStructureResponse(BaseModel):
    pipelineId: str
    name: str
    topicId: str
    type: str
    stageCount: int
    enabled: bool


@router.get('/mcp/data_processing/list_pipelines', tags=['mcp-pipeline'], operation_id="list_pipelines",
            response_model=List[PipelineStructureResponse],
            description="List existing pipelines.")
async def list_pipelines(
        topic_id: Optional[str] = None,
        principal_service: PrincipalService = Depends(get_admin_principal)) -> List[PipelineStructureResponse]:
    tenant_id = principal_service.get_tenant_id()
    pipeline_service = get_pipeline_service(principal_service)

    pipeline_service.begin_transaction()
    try:
        if topic_id:
            pipelines = pipeline_service.find_by_topic_id(topic_id, tenant_id)
        else:
            pipelines = pipeline_service.find_all(tenant_id)

        result = []
        for p in pipelines:
            result.append(PipelineStructureResponse(
                pipelineId=p.pipelineId,
                name=p.name,
                topicId=p.topicId,
                type=p.type,
                stageCount=len(p.stages) if p.stages else 0,
                enabled=p.enabled
            ))

        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('list_pipelines', e))
    finally:
        pipeline_service.close_transaction()


@router.get('/mcp/data_processing/find_pipelines_by_source_topic_name', tags=['mcp-pipeline'], operation_id="find_pipelines_by_source_topic_name",
            response_model=List[Dict[str, Any]],
            description="Find pipelines by source topic name.")
async def find_pipelines_by_source_topic_name(
        source_topic_name: str,
        principal_service: PrincipalService = Depends(get_admin_principal)) -> List[Dict[str, Any]]:
    tenant_id = principal_service.get_tenant_id()
    topic_service = get_topic_service(principal_service)
    pipeline_service = get_pipeline_service(principal_service)

    topic_service.begin_transaction()
    pipeline_service.begin_transaction()
    try:
        topic = topic_service.find_by_name_and_tenant(source_topic_name, tenant_id)
        if not topic:
            raise HTTPException(status_code=404, detail=f"Source topic '{source_topic_name}' not found.")

        pipelines = pipeline_service.find_by_topic_id(topic.topicId, tenant_id)
        return [pipeline.dict() for pipeline in pipelines]
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('find_pipelines_by_source_topic_name', e))
    finally:
        topic_service.close_transaction()
        pipeline_service.close_transaction()


@router.get('/mcp/data_processing/get_pipeline', tags=['mcp-pipeline'], operation_id="get_pipeline",
            response_model=Dict[str, Any],
            description="Load full pipeline definition by pipeline ID.")
async def get_pipeline(
        pipeline_id: str,
        principal_service: PrincipalService = Depends(get_admin_principal)) -> Dict[str, Any]:
    tenant_id = principal_service.get_tenant_id()
    pipeline_service = get_pipeline_service(principal_service)

    pipeline_service.begin_transaction()
    try:
        pipeline = pipeline_service.find_by_id(pipeline_id)
        if not pipeline:
            raise HTTPException(status_code=404, detail=f"Pipeline {pipeline_id} not found.")

        if pipeline.tenantId != tenant_id:
            raise HTTPException(status_code=403, detail=f"Pipeline {pipeline_id} does not belong to current tenant.")

        return pipeline.dict()
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=_format_error('get_pipeline', e))
    finally:
        pipeline_service.close_transaction()
