from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import DataModel
from .chart_basic_style import ChartBorder, ChartBorderStyle, ChartFont
from .chart_settings import ChartSettings
from .chart_types import ChartColor, ChartType


class Chart(DataModel, BaseModel):
	type: ChartType = ChartType.COUNT
	settings: ChartSettings = None

	def __setattr__(self, name, value):
		if name == 'settings':
			if self.type is not None:
				super().__setattr__(name, construct_settings(value, self.type))
			else:
				super().__setattr__(name, value)
		elif name == 'type':
			if self.settings is not None:
				super().__setattr__(name, construct_settings(self.settings, value))
			else:
				super().__setattr__(name, value)
		else:
			super().__setattr__(name, value)


class EChartsBorderHolder(DataModel):
	border: ChartBorder = None


class EChartsBorderOmitRadius(DataModel):
	color: ChartColor = None
	style: ChartBorderStyle = None
	width: float = None


class EChartsBorderHolderNoRadius(DataModel):
	border: EChartsBorderOmitRadius = None


class EChartsFontHolder(DataModel):
	font: ChartFont = None


class EChartsPosition(DataModel):
	top: float = None
	right: float = None
	left: float = None
	bottom: float = None


class EChartsPositionHolder(DataModel):
	position: EChartsPosition = None


class EChartsHorizontalAlignment(str, Enum):
	AUTO = 'auto',
	LEFT = 'left',
	RIGHT = 'right',
	CENTER = 'center'


class EChartsVerticalAlignment(str, Enum):
	AUTO = 'auto',
	TOP = 'top',
	BOTTOM = 'bottom',
	MIDDLE = 'middle'


class EChartsAlignmentHolder(DataModel):
	horizontalAlign: EChartsHorizontalAlignment = None
	verticalAlign: EChartsVerticalAlignment = None


class EChartsTitleText(EChartsFontHolder, BaseModel):
	text: str = None


class EChartsTitle(EChartsBorderHolder, EChartsPositionHolder, EChartsAlignmentHolder, BaseModel):
	text: EChartsTitleText = None
	subtext: EChartsTitleText = None
	backgroundColor: ChartColor = None
	padding: float = None
	itemGap: float = None


class EChartsTitleHolder(DataModel, BaseModel):
	title: EChartsTitle = None


class EChartsLegendOrient(str, Enum):
	HORIZONTAL = 'horizontal',
	VERTICAL = 'vertical'


class EChartsLegend(EChartsBorderHolder, EChartsPositionHolder, EChartsFontHolder):
	show: bool = None
	orient: EChartsLegendOrient = None
	backgroundColor: ChartColor = None
	padding: float = None


class EChartsLegendHolder(DataModel):
	legend: EChartsLegend = None


class EChartsGrid(EChartsBorderHolderNoRadius, EChartsPositionHolder):
	show: bool = None
	containLabel: bool = None
	backgroundColor: ChartColor = None


class EChartsGridPositionOnly(EChartsPositionHolder, BaseModel):
	pass


class EChartsGridHolder(DataModel):
	grid: EChartsGrid = None


class EChartsAxisSplitLineStyle(str, Enum):
	SOLID = 'solid',
	DASHED = 'dashed',
	DOTTED = 'dotted'


class EChartsAxisSplitLine(DataModel):
	show: bool = None
	color: ChartColor = None
	width: float = None
	style: EChartsAxisSplitLineStyle = None


class EChartsAxisSplitLineHolder(DataModel):
	splitLine: EChartsAxisSplitLine = None


class EChartsAxisMinorSplitLineHolder(DataModel):
	minorSplitLine: EChartsAxisSplitLine = None


class EChartsXAxisPosition(str, Enum):
	TOP = 'top',
	BOTTOM = 'bottom'


class EChartsXAxisType(str, Enum):
	VALUE = 'value',
	CATEGORY = 'category',
	TIME = 'time'


class EChartsXAxisNameLocation(str, Enum):
	START = 'start',
	CENTER = 'center',
	END = 'end'


# noinspection DuplicatedCode
class EChartsXAxisName(EChartsFontHolder, EChartsBorderHolder, EChartsAlignmentHolder):
	text: str = None
	location: EChartsXAxisNameLocation = None
	backgroundColor: ChartColor = None
	gap: float = None
	rotate: float = None
	padding: float = None


class EChartsXAxisLabel(EChartsFontHolder, EChartsBorderHolder, EChartsAlignmentHolder):
	show: bool = None
	inside: bool = None
	backgroundColor: ChartColor = None
	gap: float = None
	rotate: float = None
	padding: float = None


class EChartsXAxis(EChartsAxisSplitLineHolder, EChartsAxisMinorSplitLineHolder):
	show: bool = None
	position: EChartsXAxisPosition = None
	type: EChartsXAxisType = None
	name: EChartsXAxisName = None
	label: EChartsXAxisLabel = None
	autoMin: bool = None
	min: float = None
	autoMax: bool = None
	max: float = None


class EChartsXAxisHolder(DataModel):
	# noinspection SpellCheckingInspection
	xaxis: EChartsXAxis = None


class EChartsYAxisPosition(str, Enum):
	LEFT = 'left',
	RIGHT = 'right'


class EChartsYAxisType(str, Enum):
	VALUE = 'value',
	CATEGORY = 'category',
	TIME = 'time'


class EChartsYAxisNameLocation(str, Enum):
	START = 'start',
	MIDDLE = 'middle',
	END = 'end'


# noinspection DuplicatedCode
class EChartsYAxisName(EChartsFontHolder, EChartsBorderHolder, EChartsAlignmentHolder):
	text: str = None
	location: EChartsYAxisNameLocation = None
	backgroundColor: ChartColor = None
	gap: float = None
	rotate: float = None
	padding: float = None


class EChartsYAxisLabel(EChartsFontHolder, EChartsBorderHolder, EChartsAlignmentHolder):
	show: bool = None
	inside: bool = None
	backgroundColor: ChartColor = None
	gap: float = None
	rotate: float = None
	padding: float = None


class EChartsYAxis(EChartsAxisSplitLineHolder, EChartsAxisMinorSplitLineHolder):
	show: bool = None
	position: EChartsYAxisPosition = None
	type: EChartsYAxisType = None
	name: EChartsYAxisName = None
	label: EChartsYAxisLabel = None
	autoMin: bool = None
	min: float = None
	autoMax: bool = None
	max: float = None


class EChartsYAxisHolder(DataModel):
	yaxis: EChartsYAxis = None


class EChartsToolboxOrient(str, Enum):
	HORIZONTAL = 'horizontal',
	VERTICAL = 'vertical'


class EChartsToolbox(EChartsPositionHolder):
	show: bool = None
	orient: EChartsToolboxOrient = None


class EChartsToolboxHolder(DataModel):
	toolbox: EChartsToolbox = None


EchartsScriptsVars = Dict[str, str]


class EchartsScriptHolder(DataModel):
	script: str = None
	# noinspection SpellCheckingInspection
	scriptVarsDefs: str = None
	scriptVars: EchartsScriptsVars = None


class ItemType(str, Enum):
	SECTION = 'section',
	NUMBER = 'number',
	PERCENTAGE = 'percentage',
	BOOLEAN = 'boolean',
	TEXT = 'text',
	COLOR = 'color',
	DROPDOWN = 'dropdown'


class DefItem(DataModel):
	type: ItemType = None
	label: str = None


class SectionItem(DefItem):
	type: ItemType.SECTION = ItemType.SECTION


class InputItem(DefItem):
	key: str = None


class NumberItem(InputItem):
	type: ItemType.NUMBER = ItemType.NUMBER
	placeholder: str = None
	unit: str = None
	defaultValue: float = None


class PercentageItem(InputItem):
	type: ItemType.PERCENTAGE = ItemType.PERCENTAGE
	placeholder: str = None
	defaultValue: float = None


class BooleanItem(InputItem):
	type: ItemType.BOOLEAN = ItemType.BOOLEAN
	defaultValue: bool = None


class TextItem(InputItem):
	type: ItemType.TEXT = ItemType.TEXT
	placeholder: str = None
	defaultValue: str = None


class ColorItem(InputItem):
	type: ItemType.COLOR = ItemType.COLOR
	defaultValue: ChartColor = None


class DropdownItemOption(DataModel):
	value: Union[str, int, float, bool] = None
	label: str = None


class DropdownItem(InputItem):
	type: ItemType.DROPDOWN = ItemType.DROPDOWN
	placeholder: str = None
	options: List[DropdownItemOption] = []
	defaultValue: Any = None


class EChartsSettings(ChartSettings, EChartsTitleHolder):
	pass


class CountChartSettingsText(DataModel, BaseModel):
	font: ChartFont = None
	formatUseGrouping: bool = None


class CountChartSettings(EChartsSettings):
	countText: CountChartSettingsText = None


class CountChart(Chart):
	type: ChartType = ChartType.COUNT
	settings: CountChartSettings = None


class BarLabelPosition(str, Enum):
	TOP = 'top',
	LEFT = 'left',
	RIGHT = 'right',
	BOTTOM = 'bottom',
	INSIDE = 'inside',
	INSIDE_LEFT = 'insideLeft',
	INSIDE_RIGHT = 'insideRight',
	INSIDE_TOP = 'insideTop',
	INSIDE_BOTTOM = 'insideBottom',
	INSIDE_TOP_LEFT = 'insideTopLeft',
	INSIDE_BOTTOM_LEFT = 'insideBottomLeft',
	INSIDE_TOP_RIGHT = 'insideTopRight',
	INSIDE_BOTTOM_RIGHT = 'insideBottomRight'


class BarChartSettingsLabel(EChartsBorderHolder, EChartsFontHolder, EChartsAlignmentHolder, BaseModel):
	show: bool = None
	backgroundColor: ChartColor = None
	position: BarLabelPosition = None
	rotate: float = None
	gap: float = None
	padding: float = None
	formatUseGrouping: bool = None
	formatUsePercentage: bool = None
	valueAsPercentage: bool = None
	fractionDigits: int = None


class BarChartSettingsSeries(DataModel, BaseModel):
	transformAxis: bool = None


class BarChartSettings(EChartsSettings, EChartsLegendHolder, EChartsGridHolder, EChartsXAxisHolder, EChartsYAxisHolder):
	series: BarChartSettingsSeries = None
	label: BarChartSettingsLabel = None
	decal: bool = None


class BarChart(Chart):
	type: ChartType = ChartType.BAR
	settings: BarChartSettings = None


class LineChartSettingsSeries(BarChartSettingsSeries):
	smooth: bool = None


class LineChartSettings(
	EChartsSettings, EChartsLegendHolder, EChartsGridHolder, EChartsXAxisHolder, EChartsYAxisHolder):
	series: LineChartSettingsSeries = None
	label: BarChartSettingsLabel = None


class LineChart(Chart):
	type: ChartType = ChartType.LINE
	settings: LineChartSettings = None


class ScatterChartSettings(
	EChartsSettings, EChartsLegendHolder, EChartsGridHolder, EChartsXAxisHolder, EChartsYAxisHolder):
	pass


class ScatterChart(Chart):
	type: ChartType = ChartType.SCATTER
	settings: ScatterChartSettings = None


class PieRoseType(str, Enum):
	NONE = 'none',
	RADIUS = 'radius',
	AREA = 'area'


class PieLabelPosition(str, Enum):
	INSIDE = 'inside',
	OUTSIDE = 'outside',
	CENTER = 'center'


class PieLabelAlignTo(str, Enum):
	NONE = 'none',
	LABEL_LINE = 'labelLine',
	EDGE = 'edge'


# noinspection DuplicatedCode
class PieChartSettingsLabel(EChartsBorderHolder, EChartsFontHolder, EChartsAlignmentHolder, BaseModel):
	show: bool = None
	backgroundColor: ChartColor = None
	position: PieLabelPosition = None
	alignTo: PieLabelAlignTo = None
	rotate: float = None
	gap: float = None
	padding: float = None
	formatUseGrouping: bool = None
	formatUsePercentage: bool = None
	valueAsPercentage: bool = None
	fractionDigits: int = None


class PieChartSettingsSeries(EChartsBorderHolder, BaseModel):
	centerX: float = None
	centerY: float = None
	insideRadius: float = None
	outsideRadius: float = None
	roseType: PieRoseType = None
	showPercentage: bool = None


class PieChartSettings(EChartsSettings, EChartsLegendHolder):
	series: PieChartSettingsSeries = None
	grid: EChartsGridPositionOnly = None
	label: PieChartSettingsLabel = None
	decal: bool = None


class PieChart(Chart):
	type: ChartType = ChartType.PIE
	settings: PieChartSettings = None


class DoughnutChartSettings(PieChartSettings):
	pass


class DoughnutChart(Chart):
	type: ChartType = ChartType.DOUGHNUT
	settings: DoughnutChartSettings = None


class NightingaleChartSettings(PieChartSettings):
	pass


class NightingaleChart(Chart):
	type: ChartType = ChartType.NIGHTINGALE
	settings: NightingaleChartSettings = None


class SunburstChartSettingsSeries(EChartsBorderHolder, BaseModel):
	centerX: float = None
	centerY: float = None
	insideRadius: float = None
	outsideRadius: float = None


class SunburstChartSettings(PieChartSettings):
	series: SunburstChartSettingsSeries = None


class SunburstChart(Chart):
	type: ChartType = ChartType.SUNBURST
	settings: SunburstChartSettings = None


class TreeLayout(str, Enum):
	ORTHOGONAL = 'orthogonal',
	RADIAL = 'radial'


class TreeOrient(str, Enum):
	LEFT_RIGHT = 'LR',
	RIGHT_LEFT = 'RL',
	TOP_BOTTOM = 'TB',
	BOTTOM_TOP = 'BT'


class TreeChartSettingsSeries(DataModel, BaseModel):
	layout: TreeLayout = None
	orient: TreeOrient = None
	roam: bool = None


class TreeChartSettings(EChartsSettings):
	series: TreeChartSettingsSeries = None
	grid: EChartsGridPositionOnly = None


class TreeChart(Chart):
	type: ChartType = ChartType.TREE
	settings: TreeChartSettings = None


class TreemapChartSettingsSeries(DataModel, BaseModel):
	roam: bool = None


class TreemapChartSettings(EChartsSettings):
	series: TreemapChartSettingsSeries = None
	grid: EChartsGridPositionOnly = None


class TreemapChart(Chart):
	type: ChartType = ChartType.TREEMAP
	settings: TreemapChartSettings = None


class MapChartRegion(str, Enum):
	CHINA_L1 = 'china-l1',
	CYPRUS_L1 = 'cyprus-l1',
	JAPAN_L1 = 'japan-l1',
	SINGAPORE_L1 = 'singapore-l1',
	USA_L1 = 'usa-l1'


class MapChartSettingsSeries(DataModel, BaseModel):
	region: MapChartRegion = None


class MapChartSettings(EChartsSettings):
	series: MapChartSettingsSeries = None
	grid: EChartsGridPositionOnly = None


class MapChart(Chart):
	type: ChartType = ChartType.MAP
	settings: MapChartSettings = None


class CustomizedChartSettings(EChartsSettings, EchartsScriptHolder):
	pass


class CustomizedChart(Chart):
	type: ChartType = ChartType.CUSTOMIZED
	settings: CustomizedChartSettings = None


def construct_settings(
		settings: Optional[Union[dict, ChartSettings]], chart_type: ChartType) -> Optional[ChartSettings]:
	if settings is None:
		return None
	elif isinstance(settings, ChartSettings):
		return settings
	elif chart_type == ChartType.COUNT:
		return CountChartSettings(**settings)
	elif chart_type == ChartType.BAR:
		return BarChartSettings(**settings)
	elif chart_type == ChartType.LINE:
		return LineChartSettings(**settings)
	elif chart_type == ChartType.SCATTER:
		return ScatterChartSettings(**settings)
	elif chart_type == ChartType.PIE:
		return PieChartSettings(**settings)
	elif chart_type == ChartType.DOUGHNUT:
		return DoughnutChartSettings(**settings)
	elif chart_type == ChartType.NIGHTINGALE:
		return NightingaleChartSettings(**settings)
	elif chart_type == ChartType.SUNBURST:
		return SunburstChartSettings(**settings)
	elif chart_type == ChartType.TREE:
		return TreeChartSettings(**settings)
	elif chart_type == ChartType.TREEMAP:
		return TreemapChartSettings(**settings)
	elif chart_type == ChartType.MAP:
		return MapChartSettings(**settings)
	elif chart_type == ChartType.CUSTOMIZED:
		return CustomizedChartSettings(**settings)
	else:
		raise Exception(f'Chart type[{chart_type}] cannot be recognized.')
