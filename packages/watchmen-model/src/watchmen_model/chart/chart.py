from enum import Enum
from typing import Any, Dict, List, Optional, Union

from watchmen_model.common import DataModel
from watchmen_utilities import ExtendedBaseModel
from .chart_basic_style import ChartBorder, ChartBorderStyle, ChartFont
from .chart_settings import ChartSettings
from .chart_types import ChartColor, ChartType


class Chart(ExtendedBaseModel):
	type: ChartType = ChartType.COUNT
	settings: Optional[ChartSettings] = None

	def __setattr__(self, name, value):
		if name == 'settings':
			if self.type is not None:
				super().__setattr__(name, construct_settings(value, self.type))
			else:
				super().__setattr__(name, value)
		elif name == 'type':
			super().__setattr__(name, value)
			if self.settings is not None:
				super().__setattr__('settings', construct_settings(self.settings, value))
		else:
			super().__setattr__(name, value)


class EChartsBorderHolder(DataModel):
	border: Optional[ChartBorder] = None


class EChartsBorderOmitRadius(DataModel):
	color: Optional[ChartColor] = None
	style: Optional[ChartBorderStyle] = None
	width: Optional[float] = None


class EChartsBorderHolderNoRadius(DataModel):
	border: Optional[EChartsBorderOmitRadius] = None


class EChartsFontHolder(DataModel):
	font: Optional[ChartFont] = None


class EChartsPosition(DataModel):
	top: Optional[float] = None
	right: Optional[float] = None
	left: Optional[float] = None
	bottom: Optional[float] = None


class EChartsPositionHolder(DataModel):
	position: Optional[EChartsPosition] = None


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
	horizontalAlign: Optional[EChartsHorizontalAlignment] = None
	verticalAlign: Optional[EChartsVerticalAlignment] = None


class EChartsTitleText(ExtendedBaseModel, EChartsFontHolder):
	text: Optional[str] = None


class EChartsTitle(ExtendedBaseModel, EChartsBorderHolder, EChartsPositionHolder, EChartsAlignmentHolder):
	text: Optional[EChartsTitleText] = None
	subtext: Optional[EChartsTitleText] = None
	backgroundColor: Optional[ChartColor] = None
	padding: Optional[float] = None
	itemGap: Optional[float] = None


class EChartsTitleHolder(ExtendedBaseModel):
	title: Optional[EChartsTitle] = None


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


class EChartsGridPositionOnly(ExtendedBaseModel, EChartsPositionHolder):
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
	yaxis: Optional[EChartsYAxis] = None


class EChartsToolboxOrient(str, Enum):
	HORIZONTAL = 'horizontal',
	VERTICAL = 'vertical'


class EChartsToolbox(EChartsPositionHolder):
	show: Optional[bool] = None
	orient: Optional[EChartsToolboxOrient] = None


class EChartsToolboxHolder(DataModel):
	toolbox: Optional[EChartsToolbox] = None


EchartsScriptsVars = Dict[str, str]


class EchartsScriptHolder(DataModel):
	script: Optional[str] = None
	# noinspection SpellCheckingInspection
	scriptVarsDefs: Optional[str] = None
	scriptVars: Optional[EchartsScriptsVars] = None


class ItemType(str, Enum):
	SECTION = 'section',
	NUMBER = 'number',
	PERCENTAGE = 'percentage',
	BOOLEAN = 'boolean',
	TEXT = 'text',
	COLOR = 'color',
	DROPDOWN = 'dropdown'


class DefItem(DataModel):
	type: Optional[ItemType] = None
	label: Optional[str] = None


class SectionItem(DefItem):
	type: ItemType = ItemType.SECTION


class InputItem(DefItem):
	key: Optional[str] = None


class NumberItem(InputItem):
	type: ItemType = ItemType.NUMBER
	placeholder: Optional[str] = None
	unit: Optional[str] = None
	defaultValue: Optional[float] = None


class PercentageItem(InputItem):
	type: ItemType = ItemType.PERCENTAGE
	placeholder: Optional[str] = None
	defaultValue: Optional[float] = None


class BooleanItem(InputItem):
	type: ItemType = ItemType.BOOLEAN
	defaultValue: Optional[bool] = None


class TextItem(InputItem):
	type: ItemType = ItemType.TEXT
	placeholder: Optional[str] = None
	defaultValue: Optional[str] = None


class ColorItem(InputItem):
	type: ItemType = ItemType.COLOR
	defaultValue: Optional[ChartColor] = None


class DropdownItemOption(DataModel):
	value: Union[str, int, float, bool] = None
	label: Optional[str] = None


class DropdownItem(InputItem):
	type: ItemType = ItemType.DROPDOWN
	placeholder: Optional[str] = None
	options: Optional[List[DropdownItemOption]] = []
	defaultValue: Any = None


class EChartsSettings(ChartSettings, EChartsTitleHolder):
	pass


class CountChartSettingsText(ExtendedBaseModel):
	font: Optional[ChartFont] = None
	formatUseGrouping: Optional[bool] = None


class CountChartSettings(EChartsSettings):
	countText: Optional[CountChartSettingsText] = None


class CountChart(Chart):
	type: ChartType = ChartType.COUNT
	settings: Optional[CountChartSettings] = None


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


class BarChartSettingsLabel(ExtendedBaseModel, EChartsBorderHolder, EChartsFontHolder, EChartsAlignmentHolder):
	show: Optional[bool] = None
	backgroundColor: Optional[ChartColor] = None
	position: Optional[BarLabelPosition] = None
	rotate: Optional[float] = None
	gap: Optional[float] = None
	padding: Optional[float] = None
	formatUseGrouping: Optional[bool] = None
	formatUsePercentage: Optional[bool] = None
	valueAsPercentage: Optional[bool] = None
	fractionDigits: Optional[int] = None


class BarChartSettingsSeries(ExtendedBaseModel):
	transformAxis: Optional[bool] = None


class BarChartSettings(EChartsSettings, EChartsLegendHolder, EChartsGridHolder, EChartsXAxisHolder, EChartsYAxisHolder):
	series: Optional[BarChartSettingsSeries] = None
	label: Optional[BarChartSettingsLabel] = None
	decal: Optional[bool] = None


class BarChart(Chart):
	type: ChartType = ChartType.BAR
	settings: Optional[BarChartSettings] = None


class LineChartSettingsSeries(BarChartSettingsSeries):
	smooth: Optional[bool] = None


class LineChartSettings(
	EChartsSettings, EChartsLegendHolder, EChartsGridHolder, EChartsXAxisHolder, EChartsYAxisHolder):
	series: Optional[LineChartSettingsSeries] = None
	label: Optional[BarChartSettingsLabel] = None


class LineChart(Chart):
	type: ChartType = ChartType.LINE
	settings: Optional[LineChartSettings] = None


class ScatterChartSettings(
	EChartsSettings, EChartsLegendHolder, EChartsGridHolder, EChartsXAxisHolder, EChartsYAxisHolder):
	pass


class ScatterChart(Chart):
	type: ChartType = ChartType.SCATTER
	settings: Optional[ScatterChartSettings] = None


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
class PieChartSettingsLabel(ExtendedBaseModel, EChartsBorderHolder, EChartsFontHolder, EChartsAlignmentHolder):
	show: Optional[bool] = None
	backgroundColor: Optional[ChartColor] = None
	position: Optional[PieLabelPosition] = None
	alignTo: Optional[PieLabelAlignTo] = None
	rotate: Optional[float] = None
	gap: Optional[float] = None
	padding: Optional[float] = None
	formatUseGrouping: Optional[bool] = None
	formatUsePercentage: Optional[bool] = None
	valueAsPercentage: Optional[bool] = None
	fractionDigits: Optional[int] = None


class PieChartSettingsSeries(ExtendedBaseModel, EChartsBorderHolder):
	centerX: Optional[float] = None
	centerY: Optional[float] = None
	insideRadius: Optional[float] = None
	outsideRadius: Optional[float] = None
	roseType: Optional[PieRoseType] = None
	showPercentage: Optional[bool] = None


class PieChartSettings(EChartsSettings, EChartsLegendHolder):
	series: Optional[PieChartSettingsSeries] = None
	grid: Optional[EChartsGridPositionOnly] = None
	label: Optional[PieChartSettingsLabel] = None
	decal: Optional[bool] = None


class PieChart(Chart):
	type: ChartType = ChartType.PIE
	settings: Optional[PieChartSettings] = None


class DoughnutChartSettings(PieChartSettings):
	pass


class DoughnutChart(Chart):
	type: ChartType = ChartType.DOUGHNUT
	settings: Optional[DoughnutChartSettings] = None


class NightingaleChartSettings(PieChartSettings):
	pass


class NightingaleChart(Chart):
	type: ChartType = ChartType.NIGHTINGALE
	settings: Optional[NightingaleChartSettings] = None


class SunburstChartSettingsSeries(ExtendedBaseModel, EChartsBorderHolder):
	centerX: Optional[float] = None
	centerY: Optional[float] = None
	insideRadius: Optional[float] = None
	outsideRadius: Optional[float] = None


class SunburstChartSettings(PieChartSettings):
	series: Optional[SunburstChartSettingsSeries] = None


class SunburstChart(Chart):
	type: ChartType = ChartType.SUNBURST
	settings: Optional[SunburstChartSettings] = None


class TreeLayout(str, Enum):
	ORTHOGONAL = 'orthogonal',
	RADIAL = 'radial'


class TreeOrient(str, Enum):
	LEFT_RIGHT = 'LR',
	RIGHT_LEFT = 'RL',
	TOP_BOTTOM = 'TB',
	BOTTOM_TOP = 'BT'


class TreeChartSettingsSeries(ExtendedBaseModel):
	layout: Optional[TreeLayout] = None
	orient: Optional[TreeOrient] = None
	roam: Optional[bool] = None


class TreeChartSettings(EChartsSettings):
	series: Optional[TreeChartSettingsSeries] = None
	grid: Optional[EChartsGridPositionOnly] = None


class TreeChart(Chart):
	type: ChartType = ChartType.TREE
	settings: Optional[TreeChartSettings] = None


class TreemapChartSettingsSeries(ExtendedBaseModel):
	roam: Optional[bool] = None


class TreemapChartSettings(EChartsSettings):
	series: Optional[TreemapChartSettingsSeries] = None
	grid: Optional[EChartsGridPositionOnly] = None


class TreemapChart(Chart):
	type: ChartType = ChartType.TREEMAP
	settings: Optional[TreemapChartSettings] = None


class MapChartRegion(str, Enum):
	CHINA_L1 = 'china-l1',
	CYPRUS_L1 = 'cyprus-l1',
	JAPAN_L1 = 'japan-l1',
	SINGAPORE_L1 = 'singapore-l1',
	USA_L1 = 'usa-l1'


class MapChartSettingsSeries(ExtendedBaseModel):
	region: Optional[MapChartRegion] = None


class MapChartSettings(EChartsSettings):
	series: Optional[MapChartSettingsSeries] = None
	grid: Optional[EChartsGridPositionOnly] = None


class MapChart(Chart):
	type: ChartType = ChartType.MAP
	settings: Optional[MapChartSettings] = None


class CustomizedChartSettings(EChartsSettings, EchartsScriptHolder):
	pass


class CustomizedChart(Chart):
	type: ChartType = ChartType.CUSTOMIZED
	settings: Optional[CustomizedChartSettings] = None


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
