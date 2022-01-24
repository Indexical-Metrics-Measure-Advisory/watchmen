from datetime import datetime
from typing import List

from pydantic import BaseModel

from watchmen.model.common import DashboardId, GraphicRect, ReportId, TenantId, Tuple, UserId


class DashboardReport(BaseModel):
	reportId: ReportId = None
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
