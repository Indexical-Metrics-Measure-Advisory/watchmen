from typing import Union, Optional, List

from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import parse_parameter_for_storage
from watchmen_inquiry_kernel.schema import SubjectSchema
from watchmen_model.console import Subject
from watchmen_model.console.subject_ext import SubjectWithFactorType, SubjectDatasetColumnWithType
from watchmen_utilities import ArrayHelper


# find template connected space with connect id
def add_dataset_column_type(
		subject_with_type: SubjectWithFactorType, principal_service: PrincipalService) -> SubjectWithFactorType:
	dataset = subject_with_type.dataset
	schema = SubjectSchema(subject_with_type, principal_service, True)
	available_schemas = schema.get_available_schemas()

	def ask_column_type(column: SubjectDatasetColumnWithType):
		if not column.recalculate:
			parsed_parameter = parse_parameter_for_storage(
				column.parameter, available_schemas, principal_service, False)
			parsed_parameter.parse(column.parameter, available_schemas, principal_service, False)
			# TODO get first possible type , will fix it in feature
			# if parsed_parameter.get_possible_types():
			column_type = parsed_parameter.get_possible_types()[0]
			if column_type:
				column.columnType = column_type.value
			return column
		else:
			return column

	dataset.columns = ArrayHelper(dataset.columns).map(lambda x: ask_column_type(x)).to_list()
	return subject_with_type


def construct_subject_with_type(subject: Union[dict, Subject]) -> Optional[SubjectWithFactorType]:
	if subject is None:
		return None
	elif isinstance(subject, SubjectWithFactorType):
		return subject
	else:
		return SubjectWithFactorType(**subject)


def add_column_type_to_subjects(subjects: List[Subject], principal_service) -> List[SubjectWithFactorType]:
	subject_list_with_type = ArrayHelper(subjects).map(lambda x: construct_subject_with_type(x.to_dict())).to_list()

	return ArrayHelper(subject_list_with_type).map(lambda x: add_dataset_column_type(x, principal_service)).to_list()


def add_column_type_to_subject(subject: Subject, principal_service) -> SubjectWithFactorType:
	subject_with_type = construct_subject_with_type(subject.to_dict())
	return add_dataset_column_type(subject_with_type, principal_service)