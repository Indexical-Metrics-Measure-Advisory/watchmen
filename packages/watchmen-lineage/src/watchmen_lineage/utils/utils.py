from logging import getLogger
from typing import List, Callable, TypeVar

from fastapi import HTTPException
from networkx import MultiDiGraph

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_lineage.model.ast import ConstantAST, FuncParameter, FuncAst
from watchmen_lineage.model.lineage import LineageNode, LineageRelation, TopicFactorFacet, \
	TypeOfAnalysis, RelationType, RelationTypeHolders, PipelineFacet, ReadFromMemoryHolder, ReadFactorHolder, \
	ReadTopicHolder, SubjectFacet, SubjectTopicHolder
from watchmen_lineage.service.builder import graphic_builder
from watchmen_lineage.utils.constant_utils import parse_constant_parameter
from watchmen_meta.common import StorageService
from watchmen_model.admin import FactorType, Topic, Factor
from watchmen_model.common import ParameterComputeType, TopicFactorParameter, Parameter, ParameterKind, \
	ComputedParameter, TopicId, ConstantParameter
from watchmen_rest.util import raise_500
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def get_source_and_target_key(edge):
	lineage_relation = LineageRelation()
	lineage_relation.sourceId = edge[0]
	lineage_relation.targetId = edge[1]
	lineage_relation.attributes = edge[2]
	if "relation_type" in lineage_relation.attributes:
		lineage_relation.relationType = lineage_relation.attributes["relation_type"]
	return lineage_relation


def parse_type_of_analysis(factor_type: FactorType) -> TypeOfAnalysis:
	if factor_type == FactorType.EMAIL or factor_type == FactorType.ADDRESS or factor_type == FactorType.DATE_OF_BIRTH or factor_type == FactorType.FAX or \
			factor_type == FactorType.ID_NO or factor_type == FactorType.PHONE or factor_type == FactorType.MOBILE:
		return TypeOfAnalysis.PII
	elif factor_type == FactorType.NUMBER or factor_type == FactorType.AGE or factor_type == FactorType.UNSIGNED:
		return TypeOfAnalysis.Measure
	elif factor_type == FactorType.DATE or factor_type == FactorType.DATETIME or factor_type == FactorType.FULL_DATETIME or factor_type == FactorType.MONTH or \
			factor_type == FactorType.YEAR or factor_type == FactorType.WEEK_OF_YEAR or factor_type == FactorType.WEEK_OF_MONTH or \
			factor_type == FactorType.DAY_OF_WEEK or factor_type == FactorType.DAY_OF_MONTH or factor_type == FactorType.TEN_DAYS or \
			factor_type == FactorType.TIME or factor_type == FactorType.HOUR or factor_type == FactorType.HALF_WEEK or factor_type == FactorType.HALF_YEAR or \
			factor_type == FactorType.AM_PM or factor_type == FactorType.MILLISECOND or factor_type == FactorType.MINUTE or factor_type == FactorType.QUARTER or factor_type == FactorType.SECOND \
			or factor_type == FactorType.MILLISECOND:
		return TypeOfAnalysis.TimeDimension
	elif factor_type == FactorType.ENUM or factor_type == FactorType.CITY or factor_type == FactorType.BOOLEAN or factor_type == FactorType.COUNTRY or factor_type == FactorType.TEXT or \
			factor_type == FactorType.DISTRICT or factor_type == FactorType.ROAD or factor_type == FactorType.RESIDENCE_TYPE or factor_type == FactorType.REGION or factor_type == FactorType.RELIGION or \
			factor_type == FactorType.RESIDENTIAL_AREA or factor_type == FactorType.FLOOR or factor_type == FactorType.GENDER or factor_type == FactorType.PROVINCE or factor_type == FactorType.NATIONALITY or \
			factor_type == FactorType.CONTINENT or factor_type == FactorType.COMMUNITY or factor_type == FactorType.OCCUPATION or factor_type == FactorType.BIZ_SCALE or factor_type == FactorType.BIZ_TRADE:
		return TypeOfAnalysis.Dimension
	else:
		return TypeOfAnalysis.Other


def is_datetime_compute(source):
	return source.type == ParameterComputeType.DAY_OF_MONTH or source.type == ParameterComputeType.DAY_OF_WEEK or \
	       source.type == ParameterComputeType.HALF_YEAR_OF or source.type == ParameterComputeType.MONTH_OF or \
	       source.type == ParameterComputeType.QUARTER_OF or source.type == ParameterComputeType.WEEK_OF_MONTH or \
	       source.type == ParameterComputeType.WEEK_OF_YEAR or source.type == ParameterComputeType.YEAR_OF


def is_number_calculate(source):
	return source.type == ParameterComputeType.ADD or source.type == ParameterComputeType.MODULUS or \
	       source.type == ParameterComputeType.DIVIDE or source.type == ParameterComputeType.MULTIPLY \
	       or source.type == ParameterComputeType.SUBTRACT


def isRecalculateColumnTopic(topic_id: TopicId):
	return topic_id == "-1"


def process_ast(asts: List[ConstantAST], parent_facet: LineageNode, target_factor_facet: TopicFactorFacet,
                graphic: MultiDiGraph, principal_service: PrincipalService):
	for ast in asts:
		if ast.funcAst:
			for function_param in ast.funcAst.params:
				if isinstance(function_param, FuncParameter):
					__process_constant(function_param, graphic, parent_facet, principal_service, target_factor_facet)
				elif isinstance(function_param, FuncAst):
					pass  # TODO
				elif isinstance(function_param, ConstantAST):
					pass  # TODO
				else:
					__process_constant(function_param, graphic, parent_facet, principal_service, target_factor_facet)


def __process_constant(function_param, graphic, parent_facet, principal_service, target_factor_facet):
	if isinstance(parent_facet, PipelineFacet):
		process_func_parameter_for_pipeline(function_param, graphic, parent_facet, target_factor_facet,
		                                    principal_service)
	elif isinstance(parent_facet, SubjectFacet):
		process_func_parameter_for_subject(function_param, graphic, parent_facet,
		                                   target_factor_facet,
		                                   principal_service)
	else:
		logger.error("current don't support")


def constant_process_for_subject(parameter_list, graphic, parent_facet, target_factor_facet):
	for func_parameter in parameter_list:
		# if len(parameter_list) == 1:
		# 	func_parameter: FuncParameter = parameter_list[0]
		constant_process_for_subject(func_parameter, graphic, parent_facet, target_factor_facet)


# else:
# 	pass  # TODO


def process_func_parameter_for_subject(func_parameter, graphic, parent_facet: SubjectFacet, target_factor_facet,
                                       principal_service: PrincipalService):
	if type(func_parameter) == str:
		return
	variable_name = func_parameter.value[0]
	if variable_name in parent_facet.topicsHolder:
		subject_topic_holder: SubjectTopicHolder = parent_facet.topicsHolder[variable_name]
		topic: Topic = subject_topic_holder.topic
		# print(func_parameter)
		factor: Factor = find_factor(topic, func_parameter.method)

		source_factor_facet = TopicFactorFacet(nodeId=factor.factorId, parentId=topic.topicId)
		graphic_builder.add_edge_with_relation(graphic, source_factor_facet,
		                                       target_factor_facet, RelationType.ConstantsReference,
		                                       None,
		                                       parent_facet.get_attributes(), parent_facet.lineageType)


def constant_process_for_pipeline(parameter_list, graphic, parent_facet, target_factor_facet):
	for func_parameter in parameter_list:
		# if len(parameter_list) == 1:
		# 	func_parameter: FuncParameter = parameter_list[0]
		process_func_parameter_for_pipeline(func_parameter, graphic, parent_facet, target_factor_facet)


def find_factor(topic: Topic, factor_name: str) -> Factor:
	return ArrayHelper(topic.factors).find(lambda x: x.name == factor_name)


def process_func_parameter_for_pipeline(func_parameter, graphic, parent_facet, target_factor_facet,
                                        principal_service: PrincipalService):
	variable_name = func_parameter.value[0]
	if variable_name in parent_facet.readFromMemoryContext:
		holder: ReadFromMemoryHolder = parent_facet.readFromMemoryContext[variable_name]
		source: TopicFactorParameter = holder.parameter
		source_factor_facet = TopicFactorFacet(nodeId=source.factorId, parentId=source.topicId)
		graphic_builder.add_edge_with_relation(graphic, source_factor_facet,
		                                       target_factor_facet, RelationType.ReadAndWrite,
		                                       None,
		                                       parent_facet.get_attributes(), parent_facet.lineageType)

	elif variable_name in parent_facet.readFactorContext:
		holder: ReadFactorHolder = parent_facet.readFactorContext[variable_name]
		source_factor_facet = TopicFactorFacet(nodeId=holder.factorId, parentId=holder.topicId)
		graphic_builder.add_edge_with_relation(graphic, source_factor_facet,
		                                       target_factor_facet, RelationType.ReadAndWrite,
		                                       None,
		                                       parent_facet.get_attributes(), parent_facet.lineageType)

	elif variable_name in parent_facet.readRowContext:
		holder: ReadTopicHolder = parent_facet.readRowContext[variable_name]
		factor_name = func_parameter.method
		topic_service = TopicService(principal_service)
		topic: Topic = topic_service.find_by_id(holder.topicId)
		factor: Factor = find_factor(topic, factor_name)
		source_factor_facet = TopicFactorFacet(nodeId=factor.factorId, parentId=topic.topicId)
		graphic_builder.add_edge_with_relation(graphic, source_factor_facet,
		                                       target_factor_facet, RelationType.ReadAndWrite,
		                                       None,
		                                       parent_facet.get_attributes(), parent_facet.lineageType)

	## load topic
	# factor_name = func_parameter.value[1]
	else:
		print("variable_name {} is not in pipeline context ".format(variable_name))


def parse_parameter(graphic, source: Parameter, target_factor_facet, relation_info: RelationTypeHolders,
                    parent_facet: LineageNode, principal_service: PrincipalService):
	if source.kind == ParameterKind.TOPIC:
		source: TopicFactorParameter = source
		source_factor_facet = TopicFactorFacet(nodeId=source.factorId, parentId=source.topicId)
		graphic_builder.add_edge_with_relation(graphic, source_factor_facet,
		                                       target_factor_facet, relation_info.type, relation_info.arithmetic,
		                                       parent_facet.get_attributes(), parent_facet.lineageType)
	elif source.kind == ParameterKind.CONSTANT:
		source: ConstantParameter = source
		if source.value:
			# print(source.value)
			asts: List[ConstantAST] = parse_constant_parameter(source.value)
			process_ast(asts, parent_facet, target_factor_facet, graphic, principal_service)
		else:
			print("source value is empty")

		##TODO constant parse
		pass
	elif source.kind == ParameterKind.COMPUTED:
		source: ComputedParameter = source
		relation_info = RelationTypeHolders(type=RelationType.Computed, arithmetic=source.type)
		if is_number_calculate(source):
			for compute_factor in source.parameters:
				parse_parameter(graphic, compute_factor, target_factor_facet, relation_info,
				                parent_facet, principal_service)
		elif is_datetime_compute(source):
			if len(source.parameters) == 1:
				compute_factor = source.parameters[0]
				parse_parameter(graphic, compute_factor, target_factor_facet, relation_info,
				                parent_facet, principal_service)
			else:
				raise Exception("source parameter length must is 1 ")
		elif source.type == ParameterComputeType.CASE_THEN:
			for compute_factor in source.parameters:
				parse_parameter(graphic, compute_factor, target_factor_facet, relation_info,
				                parent_facet, principal_service)

TransReturned = TypeVar('TransReturned')
def trans_readonly(storage_service: StorageService, action: Callable[[], TransReturned]) -> TransReturned:
	storage_service.begin_transaction()
	try:
		return action()
	except HTTPException as e:
		raise e
	except Exception as e:
		raise_500(e)
	finally:
		storage_service.close_transaction()