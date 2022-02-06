from fastapi import APIRouter

from watchmen_auth import PrincipalService
from watchmen_meta_service.console import ReportService
from watchmen_rest_doll.doll import ask_meta_storage, ask_snowflake_generator

router = APIRouter()


def get_report_service(principal_service: PrincipalService) -> ReportService:
	return ReportService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

# TODO report routers
# @router.post("/console_space/subject/report/save", tags=["console"], response_model=Report)
# async def save_report(subject_id: str, report: Report, current_user: User = Depends(deps.get_current_user)):
# 	report = add_tenant_id_to_model(report, current_user)
# 	report.reportId = get_surrogate_key()
# 	new_report = create_report(report)
# 	subject = load_console_subject_by_id(subject_id, current_user)
# 	subject.reportIds.append(new_report.reportId)
# 	update_console_subject(subject)
# 	return new_report
# @router.post("/console_space/subject/report/update", tags=["console"], response_model=Report)
# async def update_report(report: Report, current_user: User = Depends(deps.get_current_user)):
# 	report = add_tenant_id_to_model(report, current_user)
# 	save_subject_report(report)
# 	return report
# @router.get("/console_space/subject/report/delete", tags=["console"])
# async def delete_report(report_id, current_user: User = Depends(deps.get_current_user)):
# 	subject = load_console_subject_by_report_id(report_id, current_user)
# 	subject.reportIds.remove(report_id)
# 	update_console_subject(subject)
# 	delete_report_by_id(report_id)
