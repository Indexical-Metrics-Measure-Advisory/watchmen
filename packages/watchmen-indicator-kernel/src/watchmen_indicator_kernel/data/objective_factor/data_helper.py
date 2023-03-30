from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import SubjectId, TopicId
from watchmen_model.indicator import Indicator, IndicatorBaseOn, Objective, ObjectiveFactorOnIndicator
from watchmen_utilities import is_blank, is_not_blank
from .data_service import ObjectiveFactorDataService
from .subject_base_service import SubjectBaseObjectiveFactorDataService
from .topic_base_service import TopicBaseObjectiveFactorDataService
from ..utils import ask_indicator, ask_subject, ask_topic


def get_topic_base_service(
		objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator, topic_id: TopicId,
		principal_service: PrincipalService
) -> TopicBaseObjectiveFactorDataService:
	topic = ask_topic(topic_id, principal_service)
	return TopicBaseObjectiveFactorDataService(objective, objective_factor, indicator, topic, principal_service)


def get_subject_base_service(
		objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator, subject_id: SubjectId,
		principal_service: PrincipalService
) -> SubjectBaseObjectiveFactorDataService:
	subject = ask_subject(subject_id, principal_service)
	return SubjectBaseObjectiveFactorDataService(objective, objective_factor, indicator, subject, principal_service)





def get_objective_factor_data_service(
		objective: Objective, objective_factor: ObjectiveFactorOnIndicator, principal_service: PrincipalService
) -> ObjectiveFactorDataService:
	"""
	to identify that given objective_factor is based on topic or subject
	"""
	indicator_id = objective_factor.indicatorId
	if is_blank(indicator_id):
		raise IndicatorKernelException(
			f'Indicator not declared on objective factor'
			f'[objectiveId={objective.objectiveId}, factorId={objective_factor.uuid}].')
	indicator = ask_indicator(indicator_id, principal_service)
	if indicator is None:
		raise IndicatorKernelException(
			f'Indicator[indicatorId={indicator_id}] not found for objective factor'
			f'[objectiveId={objective.objectiveId}, factorId={objective_factor.uuid}].')


	topic_or_subject_id = indicator.topicOrSubjectId
	base_on = indicator.baseOn
	if base_on == IndicatorBaseOn.TOPIC and is_not_blank(topic_or_subject_id):
		return get_topic_base_service(objective, objective_factor, indicator, topic_or_subject_id, principal_service)
	elif base_on == IndicatorBaseOn.SUBJECT and is_not_blank(topic_or_subject_id):
		return get_subject_base_service(objective, objective_factor, indicator, topic_or_subject_id, principal_service)
	else:
		raise IndicatorKernelException('Indicator is not based on topic, not supported yet.')
