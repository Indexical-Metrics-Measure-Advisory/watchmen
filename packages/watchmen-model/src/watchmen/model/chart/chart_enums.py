from enum import Enum


class PredefinedChartColorSeries(str, Enum):
	REGULAR = 'regular',
	DARK = 'dark',
	LIGHT = 'light'


class ChartBorderStyle(str, Enum):
	NONE = 'none',
	SOLID = 'solid',
	DOTTED = 'dotted',
	DASHED = 'dashed'


class ChartFontStyle(str, Enum):
	NORMAL = 'normal',
	ITALIC = 'italic'


class ChartFontWeight(str, Enum):
	W100 = '100',
	W200 = '200',
	W300 = '300',
	W400 = '400',
	W500 = '500',
	W600 = '600',
	W700 = '700',
	W800 = '800',
	W900 = '900'
