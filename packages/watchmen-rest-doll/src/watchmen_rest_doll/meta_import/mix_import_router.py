from enum import Enum
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_model.admin import Pipeline, Space, Topic, UserRole
from watchmen_model.common import ConnectedSpaceId, PipelineId, SpaceId, TopicId
from watchmen_rest_doll.auth import get_any_admin_principal
from watchmen_rest_doll.console.connected_space_router import ConnectedSpaceWithSubjects

router = APIRouter()


class MixedImportType(str, Enum):
	NON_REDUNDANT = 'non-redundant'
	REPLACE = 'replace'
	FORCE_NEW = 'force-new'


class MixImportDataRequest(BaseModel):
	topics: List[Topic] = []
	pipelines: List[Pipeline] = []
	spaces: List[Space] = []
	connectedSpaces: List[ConnectedSpaceWithSubjects] = []
	importType: MixedImportType = None


class ImportDataResult(BaseModel):
	name: Optional[str] = None
	reason: Optional[str] = None


class TopicImportDataResult(ImportDataResult):
	topicId: Optional[TopicId] = None


class PipelineImportDataResult(ImportDataResult):
	pipelineId: Optional[PipelineId] = None


class SpaceImportDataResult(ImportDataResult):
	spaceId: Optional[SpaceId] = None


class ConnectedSpaceImportDataResult(ImportDataResult):
	connectId: Optional[ConnectedSpaceId] = None


class MixImportDataResponse(BaseModel):
	passed: bool = None
	topics: List[TopicImportDataResult] = []
	pipelines: List[PipelineImportDataResult] = []
	spaces: List[SpaceImportDataResult] = []
	connectedSpaces: List[ConnectedSpaceImportDataResult] = []


@router.post('/import', tags=[UserRole.ADMIN, UserRole.SUPER_ADMIN], response_model=MixImportDataResponse)
async def mix_import(
		request: MixImportDataRequest, principal_service: PrincipalService = Depends(get_any_admin_principal)
) -> MixImportDataResponse:
	pass
# @router.post("/import", tags=["import"])
# async def import_assert(import_request: ImportDataRequest,
#                         current_user: User = Depends(deps.get_current_user)) -> ImportDataResponse:
#     if import_request.importType == ImportTPSCSType.NON_REDUNDANT.value:
#         log.info("import asset with NON_REDUNDANT type")
#         return __process_non_redundant_import(import_request, current_user)
#     elif import_request.importType == ImportTPSCSType.REPLACE.value:
#         log.info("import asset with replace type")
#         return __process_replace_import(import_request, current_user)
#     elif import_request.importType == ImportTPSCSType.FORCE_NEW.value:
#         return __process_forced_new_import(import_request, current_user)
#     else:
#         raise Exception("unknown import type {0}".format(import_request.importType))
