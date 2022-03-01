from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import Auditable, DashboardId, DataModel, GraphicRect, LastVisit, ReportId, UserBasedTuple
from watchmen_utilities import ArrayHelper
from .report import construct_funnels, ReportFunnel
from .utils import construct_rect


class DashboardReport(DataModel, BaseModel):
	reportId: ReportId = None
	funnels: List[ReportFunnel] = None
	rect: GraphicRect = None

	def __setattr__(self, name, value):
		if name == 'funnels':
			super().__setattr__(name, construct_funnels(value))
		elif name == 'rect':
			super().__setattr__(name, construct_rect(value))
		else:
			super().__setattr__(name, value)


class DashboardParagraph(DataModel, BaseModel):
	content: str = None
	rect: GraphicRect = None


def construct_report(report: Optional[Union[dict, DashboardReport]]) -> Optional[DashboardReport]:
	if report is None:
		return None
	elif isinstance(report, DashboardReport):
		return report
	else:
		return DashboardReport(**report)


def construct_reports(reports: List[Union[dict, DashboardReport]]) -> List[DashboardReport]:
	if reports is None:
		return []
	return ArrayHelper(reports).map(lambda x: construct_report(x)).to_list()


def construct_paragraph(paragraph: Optional[Union[dict, DashboardParagraph]]) -> Optional[DashboardParagraph]:
	if paragraph is None:
		return None
	elif isinstance(paragraph, DashboardParagraph):
		return paragraph
	else:
		return DashboardParagraph(**paragraph)


def construct_paragraphs(paragraphs: List[Union[dict, DashboardParagraph]]) -> List[DashboardParagraph]:
	if paragraphs is None:
		return []
	return ArrayHelper(paragraphs).map(lambda x: construct_paragraph(x)).to_list()


class Dashboard(UserBasedTuple, Auditable, LastVisit, BaseModel):
	dashboardId: DashboardId = None
	name: str = None
	reports: List[DashboardReport] = None
	paragraphs: List[DashboardParagraph] = None
	autoRefreshInterval: Optional[int] = None

	def __setattr__(self, name, value):
		if name == 'reports':
			super().__setattr__(name, construct_reports(value))
		elif name == 'paragraphs':
			super().__setattr__(name, construct_paragraphs(value))
		else:
			super().__setattr__(name, value)
