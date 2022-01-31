from typing import List

from watchmen_model.common import DashboardId, DataModel, GraphicRect, LastVisit, ReportId, UserBasedTuple
from .report import ReportFunnel


class DashboardReport(DataModel):
	reportId: ReportId = None
	funnels: List[ReportFunnel] = None
	rect: GraphicRect = None


class DashboardParagraph(DataModel):
	content: str = None
	rect: GraphicRect = None


class Dashboard(UserBasedTuple, LastVisit):
	dashboardId: DashboardId = None
	name: str = None
	reports: List[DashboardReport] = None
	paragraphs: List[DashboardParagraph] = None
	autoRefreshInterval: int = None
