from typing import List

from pydantic import BaseModel

from watchmen_model.common import DashboardId, GraphicRect, LastVisit, ReportId, UserBasedTuple
from .report import ReportFunnel


class DashboardReport(BaseModel):
	reportId: ReportId = None
	funnels: List[ReportFunnel] = None
	rect: GraphicRect = None


class DashboardParagraph(BaseModel):
	content: str = None
	rect: GraphicRect = None


class Dashboard(UserBasedTuple, LastVisit):
	dashboardId: DashboardId = None
	name: str = None
	reports: List[DashboardReport] = None
	paragraphs: List[DashboardParagraph] = None
	autoRefreshInterval: int = None
