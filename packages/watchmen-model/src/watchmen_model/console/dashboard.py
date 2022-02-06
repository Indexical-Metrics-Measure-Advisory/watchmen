from typing import List

from pydantic import BaseModel

from watchmen_model.common import Auditable, DashboardId, DataModel, GraphicRect, LastVisit, ReportId, UserBasedTuple
from .report import ReportFunnel


class DashboardReport(DataModel, BaseModel):
	reportId: ReportId = None
	funnels: List[ReportFunnel] = None
	rect: GraphicRect = None


class DashboardParagraph(DataModel, BaseModel):
	content: str = None
	rect: GraphicRect = None


class Dashboard(UserBasedTuple, Auditable, LastVisit, BaseModel):
	dashboardId: DashboardId = None
	name: str = None
	reports: List[DashboardReport] = None
	paragraphs: List[DashboardParagraph] = None
	autoRefreshInterval: int = None
