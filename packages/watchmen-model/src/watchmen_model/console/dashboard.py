from datetime import datetime
from typing import List

from pydantic import BaseModel

from watchmen_model.common import DashboardId, GraphicRect, ReportId, TenantId, Tuple, UserId
from watchmen_model.console.report import ReportFunnel


class DashboardReport(BaseModel):
	reportId: ReportId = None
	funnels: List[ReportFunnel] = None
	rect: GraphicRect = None


class DashboardParagraph(BaseModel):
	content: str = None
	rect: GraphicRect = None


class Dashboard(Tuple):
	dashboardId: DashboardId = None
	name: str = None
	reports: List[DashboardReport] = None
	paragraphs: List[DashboardParagraph] = None
	autoRefreshInterval: int = None
	userId: UserId = None
	tenantId: TenantId = None
	lastVisitTime: datetime = datetime.now().replace(tzinfo=None)
