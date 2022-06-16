from typing import Optional, Callable, Tuple

from fastapi import APIRouter, Depends

from watchmen_auth import PrincipalService
from watchmen_meta.admin.notebook_service import NotebookService
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage
from watchmen_model.admin import UserRole
from watchmen_model.admin.notebook import Notebook
from watchmen_model.common.tuple_ids import NotebookId
from watchmen_rest import get_any_principal, get_admin_principal
from watchmen_rest.util import raise_400, raise_404, validate_tenant_id, raise_403
from watchmen_rest_doll.util import trans_readonly, trans
from watchmen_utilities import is_blank

router = APIRouter()


def get_notebook_service(principal_service: PrincipalService) -> NotebookService:
    return NotebookService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


@router.get('/notebook', tags=[UserRole.ADMIN], response_model=Notebook)
async def load_notebook_by_id(
        notebook_id: Optional[NotebookId] = None,
        principal_service: PrincipalService = Depends(get_any_principal)
) -> Notebook:
    if is_blank(notebook_id):
        raise_400('notebook_id id is required.')

    notebook_service = get_notebook_service(principal_service)

    def action() -> Notebook:
        # noinspection PyTypeChecker
        notebook: Notebook = get_notebook_service.find_by_id(notebook_id)
        if notebook is None:
            raise_404()

        if not principal_service.is_super_admin():
            # tenant id must match current principal's, except current is super admin
            if notebook.tenantId != principal_service.get_tenant_id():
                raise_404()

        return notebook

    return trans_readonly(notebook_service, action)


def ask_save_notebook_action(
        notebook_service: NotebookService, principal_service: PrincipalService
) -> Callable[[Notebook], Notebook]:
    def action(notebook: Notebook) -> Tuple[Notebook, Callable[[], None]]:

        # noinspection PyTypeChecker
        existing_notebook: Optional[Notebook] = notebook_service.find_by_name(notebook.name,
                                                                              principal_service.get_tenant_id())

        if existing_notebook is not None:
            if existing_notebook.tenantId != notebook.tenantId:
                raise_403()
            else:
                notebook.notebookId = existing_notebook.notebookId
                notebook: Notebook = notebook_service.update(notebook)
        else:
            notebook_service.redress_storable_id(notebook)
            notebook: Notebook = notebook_service.create(notebook)

        return notebook

    return action


@router.post('/notebook', tags=[UserRole.ADMIN], response_model=Notebook)
async def save_notebook(
        notebook: Notebook, principal_service: PrincipalService = Depends(get_admin_principal)
) -> Notebook:
    validate_tenant_id(notebook, principal_service)
    notebook_service = get_notebook_service(principal_service)
    action = ask_save_notebook_action(notebook_service, principal_service)
    return trans(notebook_service, lambda: action(notebook))
