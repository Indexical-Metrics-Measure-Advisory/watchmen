from typing import Dict, Optional

from fastapi import APIRouter, Body, Depends

from watchmen_auth import PrincipalService
from watchmen_inquiry_kernel.meta import ReportService, SubjectService
from watchmen_inquiry_kernel.storage import ReportDataService, SubjectDataService
from watchmen_inquiry_surface.settings import ask_dataset_page_max_rows
from watchmen_model.admin import UserRole
from watchmen_model.common import ComputedParameter, ConstantParameter, DataPage, DataResult, Pageable, \
	Parameter, ParameterCondition, ParameterExpression, ParameterJoint, ParameterJointType, ParameterKind, ReportId, \
	SubjectId, TopicFactorParameter
from watchmen_model.console import Report, ReportIndicator, ReportIndicatorArithmetic, Subject, SubjectDatasetColumn, \
	SubjectDatasetCriteria, SubjectDatasetCriteriaIndicator, SubjectDatasetCriteriaIndicatorArithmetic
from watchmen_rest import get_console_principal
from watchmen_rest.util import raise_400
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

router = APIRouter()


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
	return SubjectService(principal_service)


def get_report_service(principal_service: PrincipalService) -> ReportService:
	return ReportService(principal_service)


def get_subject_data_service(subject: Subject, principal_service: PrincipalService) -> SubjectDataService:
	return SubjectDataService(subject, principal_service)


def get_report_data_service(subject: Subject, report: Report, principal_service: PrincipalService) -> ReportDataService:
	return ReportDataService(subject, report, principal_service)


@router.post('/subject/data', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DataPage)
async def fetch_subject_data(
		subject_id: Optional[SubjectId], pageable: Pageable = Body(...),
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataPage:
	if is_blank(subject_id):
		raise_400('Subject id is required.')

	subject: Optional[Subject] = get_subject_service(principal_service).find_by_id(subject_id)
	if subject is None:
		raise_400(f'Incorrect subject id[{subject_id}].')

	return get_subject_data_service(subject, principal_service).page(pageable)


@router.get('/report/data', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DataResult)
async def fetch_report_data(
		report_id: Optional[ReportId],
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataResult:
	if is_blank(report_id):
		raise_400('Report id is required.')

	report: Optional[Report] = get_report_service(principal_service).find_by_id(report_id)
	if report is None:
		raise_400(f'Incorrect report id[{report_id}].')

	subject_id = report.subjectId
	if is_blank(subject_id):
		raise_400('Subject id not declared on report.')

	subject: Optional[Subject] = get_subject_service(principal_service).find_by_id(subject_id)
	if subject is None:
		raise_400(f'Subject not found by report[id={report_id}].')

	return get_report_data_service(subject, report, principal_service).find()


@router.post('/report/temporary', tags=[UserRole.CONSOLE, UserRole.ADMIN], response_model=DataResult)
async def fetch_report_data_temporary(
		report: Report,
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataResult:
	report_id = report.reportId
	subject_id = report.subjectId
	if is_blank(report_id) and is_blank(subject_id):
		raise_400('At least one of report id or subject id needs to be provided.')

	if is_not_blank(report_id):
		existing_report: Optional[Report] = get_report_service(principal_service).find_by_id(report.reportId)
		if existing_report is not None:
			if is_not_blank(subject_id) and existing_report.subjectId != report.subjectId:
				raise_400(f'Cannot match subject by given report[id={report_id}, subjectId={subject_id}].')
			else:
				# same or is blank from given report data
				subject_id = existing_report.subjectId
		elif is_blank(subject_id):
			raise_400(f'Cannot match subject by given report[id={report_id}, subjectId={subject_id}].')

	subject: Optional[Subject] = get_subject_service(principal_service).find_by_id(subject_id)
	if subject is None:
		raise_400(f'Subject not found by report[id={report_id}, subjectId={subject_id}].')

	return get_report_data_service(subject, report, principal_service).find()


@router.post('/subject/data/criteria', tags=[UserRole.ADMIN], response_model=DataPage)
async def query_dataset(
		criteria: SubjectDatasetCriteria,
		principal_service: PrincipalService = Depends(get_console_principal)) -> DataPage:
	subject_id = criteria.subjectId
	subject_name = criteria.subjectName
	indicators = criteria.indicators
	conditions = criteria.conditions

	if is_blank(subject_id) and is_blank(subject_name):
		raise_400('At least one of subject id or subject name needs to be provided.')
	if indicators is None or len(indicators) == 0:
		raise_400('At least one indicator needs to be declared.')

	if is_not_blank(subject_id):
		subject: Optional[Subject] = get_subject_service(principal_service).find_by_id(subject_id)
	else:
		subject: Optional[Subject] = get_subject_service(principal_service).find_by_name(subject_name)
	if subject is None:
		raise_400(f'Subject not found by given criteria[id={subject_id}, name={subject_name}].')

	subject_column_map: Dict[str, SubjectDatasetColumn] = ArrayHelper(subject.dataset.columns) \
		.to_map(lambda x: x.alias, lambda x: x)

	def to_report_indicator(indicator: SubjectDatasetCriteriaIndicator) -> ReportIndicator:
		name = indicator.name
		dataset_column = subject_column_map.get(name)
		if dataset_column is None:
			raise_400(f'Cannot find column[name={name}] from subject.')

		arithmetic = ReportIndicatorArithmetic.NONE
		if indicator.arithmetic == SubjectDatasetCriteriaIndicatorArithmetic.COUNT:
			arithmetic = ReportIndicatorArithmetic.COUNT
		elif indicator.arithmetic == SubjectDatasetCriteriaIndicatorArithmetic.SUMMARY:
			arithmetic = ReportIndicatorArithmetic.SUMMARY
		elif indicator.arithmetic == SubjectDatasetCriteriaIndicatorArithmetic.AVERAGE:
			arithmetic = ReportIndicatorArithmetic.AVERAGE
		elif indicator.arithmetic == SubjectDatasetCriteriaIndicatorArithmetic.MAXIMUM:
			arithmetic = ReportIndicatorArithmetic.MAXIMUM
		elif indicator.arithmetic == SubjectDatasetCriteriaIndicatorArithmetic.MINIMUM:
			arithmetic = ReportIndicatorArithmetic.MINIMUM
		elif indicator.arithmetic == SubjectDatasetCriteriaIndicatorArithmetic.NONE or indicator.arithmetic is None:
			arithmetic = ReportIndicatorArithmetic.NONE
		else:
			raise_400(f'Indicator arithmetic[{indicator.arithmetic}] is not supported.')

		return ReportIndicator(
			columnId=dataset_column.columnId,
			arithmetic=arithmetic,
			name=indicator.alias
		)

	def to_report_joint(joint: ParameterJoint) -> ParameterJoint:
		return ParameterJoint(
			jointType=ParameterJointType.AND if joint.jointType is None else joint.jointType,
			filters=ArrayHelper(joint.filters).map(to_report_filter).to_list()
		)

	def translate_topic_factor(param: TopicFactorParameter) -> TopicFactorParameter:
		factor_id = param.factorId  # alias name on subject
		dataset_column = subject_column_map.get(factor_id)
		if dataset_column is None:
			raise_400(f'Cannot find column[name={factor_id}] from subject.')
		# topicId is not need here since subject will be build as a sub query
		return TopicFactorParameter(
			kind=ParameterKind.TOPIC,
			factorId=dataset_column.columnId
		)

	def translate_constant(param: ConstantParameter) -> ConstantParameter:
		# in constant, use alias name from subject columns
		# translate is not needed here
		return ConstantParameter(
			kind=ParameterKind.CONSTANT,
			value=param.value
		)

	def translate_computed(param: ComputedParameter) -> ComputedParameter:
		return ComputedParameter(
			kind=ParameterKind.COMPUTED,
			conditional=param.conditional,
			on=to_report_joint(param.on) if param.on is not None else None,
			type=param.type,
			parameters=ArrayHelper(param.parameters).map(translate_parameter).to_list()
		)

	def translate_parameter(parameter: Parameter) -> Parameter:
		if isinstance(parameter, TopicFactorParameter):
			return translate_topic_factor(parameter)
		elif isinstance(parameter, ConstantParameter):
			return translate_constant(parameter)
		elif isinstance(parameter, ComputedParameter):
			return translate_computed(parameter)
		else:
			raise_400(f'Cannot determine given expression[{parameter.dict()}].')

	def to_report_expression(expression: ParameterExpression) -> ParameterExpression:
		return ParameterExpression(
			left=translate_parameter(expression.left),
			operator=expression.operator,
			right=None if expression.right is None else translate_parameter(expression.right)
		)

	def to_report_filter(condition: ParameterCondition) -> ParameterCondition:
		if isinstance(condition, ParameterExpression):
			return to_report_expression(condition)
		elif isinstance(condition, ParameterJoint):
			return to_report_joint(condition)
		else:
			raise_400(f'Cannot determine given condition[{condition.dict()}].')

	if conditions is None or len(conditions) == 0:
		filters = None
	else:
		filters = ParameterJoint(
			jointType=ParameterJointType.AND,
			filters=ArrayHelper(conditions).map(to_report_filter).to_list()
		)

	# fake a report to query data
	report = Report(
		indicators=ArrayHelper(indicators).map(to_report_indicator).to_list(),
		filters=filters
	)

	page_size = ask_dataset_page_max_rows()
	if criteria.pageSize is None or criteria.pageSize < 1 or criteria.pageSize > page_size:
		page_size = ask_dataset_page_max_rows()
	else:
		page_size = criteria.pageSize

	pageable = Pageable(
		pageNumber=1 if criteria.pageNumber is None or criteria.pageNumber < 1 else criteria.pageNumber,
		pageSize=page_size
	)

	return get_report_data_service(subject, report, principal_service).page(pageable)
