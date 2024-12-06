from typing import Optional, Union, List, Dict

from watchmen_model.console import Report, Subject, ConnectedSpace, SubjectDatasetColumn, SubjectDataset
from watchmen_utilities import ArrayHelper


def construct_report(report: Optional[Union[dict, Report]]) -> Optional[Report]:
    if report is None:
        return None
    elif isinstance(report, Report):
        return report
    else:
        return Report(**report)


def construct_reports(reports: Optional[list] = None) -> Optional[List[Report]]:
    if reports is None:
        return None
    else:
        return ArrayHelper(reports).map(lambda x: construct_report(x)).to_list()


class SubjectWithReports(Subject):
    reports: List[Report] = []

    def __setattr__(self, name, value):
        if name == 'reports':
            super().__setattr__(name, construct_reports(value))
        else:
            super().__setattr__(name, value)


def construct_subject(subject: Optional[Union[dict, SubjectWithReports]]) -> Optional[SubjectWithReports]:
    if subject is None:
        return None
    elif isinstance(subject, SubjectWithReports):
        return subject
    else:
        return SubjectWithReports(**subject)


def construct_subjects(subjects: Optional[list] = None) -> Optional[List[SubjectWithReports]]:
    if subjects is None:
        return None
    else:
        return ArrayHelper(subjects).map(lambda x: construct_subject(x)).to_list()


class ConnectedSpaceWithSubjects(ConnectedSpace):
    subjects: List[SubjectWithReports] = []

    def __setattr__(self, name, value):
        if name == 'subjects':
            super().__setattr__(name, construct_subjects(value))
        else:
            super().__setattr__(name, value)


class SubjectDatasetColumnWithType(SubjectDatasetColumn):
    columnType: str = None


def construct_columns_with_type(column: Union[dict, SubjectDatasetColumn]) -> Optional[SubjectDatasetColumnWithType]:
    if column is None:
        return None
    elif isinstance(column, SubjectDatasetColumnWithType):
        return column
    else:
        return SubjectDatasetColumnWithType(**column)


class SubjectDatasetWithType(SubjectDataset):
    def __setattr__(self, name, value):
        if name == 'columns':
            super().__setattr__(name, ArrayHelper(value).map(lambda x: construct_columns_with_type(x)).to_list())
        else:
            super().__setattr__(name, value)


def construct_dataset_with_type(dataset: Optional[Dict] = None) -> Optional[SubjectDatasetWithType]:
    if dataset is None:
        return None
    elif isinstance(dataset, SubjectDatasetWithType):
        return dataset
    else:
        return SubjectDatasetWithType(**dataset)


class SubjectWithFactorType(Subject):
    def __setattr__(self, name, value):
        if name == 'dataset':
            super().__setattr__(name, construct_dataset_with_type(value))
        else:
            super().__setattr__(name, value)
