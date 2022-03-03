from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import EnumId, FactorId, Storable


class FactorType(str, Enum):
	SEQUENCE = 'sequence',

	NUMBER = 'number',
	UNSIGNED = 'unsigned',  # 0 & positive

	TEXT = 'text',

	# address
	ADDRESS = 'address',
	CONTINENT = 'continent',
	REGION = 'region',
	COUNTRY = 'country',
	PROVINCE = 'province',
	CITY = 'city',
	DISTRICT = 'district',
	ROAD = 'road',
	COMMUNITY = 'community',
	FLOOR = 'floor',
	RESIDENCE_TYPE = 'residence-type',
	RESIDENTIAL_AREA = 'residential-area',

	# contact electronic
	EMAIL = 'email',
	PHONE = 'phone',
	MOBILE = 'mobile',
	FAX = 'fax',

	# date time related
	DATETIME = 'datetime',  # YYYY-MM-DD HH:mm:ss
	FULL_DATETIME = 'full-datetime',  # YYYY-MM-DD HH:mm:ss.SSS
	DATE = 'date',  # YYYY-MM-DD
	TIME = 'time',  # HH:mm:ss
	YEAR = 'year',  # 4 digits
	HALF_YEAR = 'half-year',  # 1: first half, 2: second half
	QUARTER = 'quarter',  # 1 - 4
	MONTH = 'month',  # 1 - 12
	HALF_MONTH = 'half-month',  # 1: first half, 2: second half
	TEN_DAYS = 'ten-days',  # 1, 2, 3
	WEEK_OF_YEAR = 'week-of-year',  # 0 (the partial week that precedes the first Sunday of the year) - 53 (leap year)
	WEEK_OF_MONTH = 'week-of-month',  # 0 (the partial week that precedes the first Sunday of the year) - 5
	HALF_WEEK = 'half-week',  # 1: first half, 2: second half
	DAY_OF_MONTH = 'day-of-month',  # 1 - 31, according to month/year
	DAY_OF_WEEK = 'day-of-week',  # 1 (Sunday) - 7 (Saturday)
	DAY_KIND = 'day-kind',  # 1: workday, 2: weekend, 3: holiday
	HOUR = 'hour',  # 0 - 23
	HOUR_KIND = 'hour-kind',  # 1: work time, 2: off hours, 3: sleeping time
	MINUTE = 'minute',  # 0 - 59
	SECOND = 'second',  # 0 - 59
	MILLISECOND = 'millisecond',  # 0 - 999
	AM_PM = 'am-pm',  # 1, 2

	# individual
	GENDER = 'gender',
	OCCUPATION = 'occupation',
	DATE_OF_BIRTH = 'date-of-birth',  # YYYY-MM-DD
	AGE = 'age',
	ID_NO = 'id-no',
	RELIGION = 'religion',
	NATIONALITY = 'nationality',

	# organization
	BIZ_TRADE = 'biz-trade',
	BIZ_SCALE = 'biz-scale',

	BOOLEAN = 'boolean',

	ENUM = 'enum',

	OBJECT = 'object',
	ARRAY = 'array'


class FactorIndexGroup(str, Enum):
	INDEX_1 = 'i-1',
	INDEX_2 = 'i-2',
	INDEX_3 = 'i-3',
	INDEX_4 = 'i-4',
	INDEX_5 = 'i-5',
	INDEX_6 = 'i-6',
	INDEX_7 = 'i-7',
	INDEX_8 = 'i-8',
	INDEX_9 = 'i-9',
	INDEX_10 = 'i-10',
	UNIQUE_INDEX_1 = 'u-1',
	UNIQUE_INDEX_2 = 'u-2',
	UNIQUE_INDEX_3 = 'u-3',
	UNIQUE_INDEX_4 = 'u-4',
	UNIQUE_INDEX_5 = 'u-5',
	UNIQUE_INDEX_6 = 'u-6',
	UNIQUE_INDEX_7 = 'u-7',
	UNIQUE_INDEX_8 = 'u-8',
	UNIQUE_INDEX_9 = 'u-9',
	UNIQUE_INDEX_10 = 'u-10',


class FactorEncryptMethod(str, Enum):
	NONE = 'none',
	AES256_PKCS5_PADDING = 'AES256-PKCS5-PADDING',
	MD5 = 'MD5',
	SHA256 = 'SHA256',
	MASK_MAIL = 'MASK-MAIL',
	MASK_CENTER_3 = 'MASK-CENTER-3',
	MASK_CENTER_5 = 'MASK-CENTER-5',
	MASK_LAST_3 = 'MASK-LAST-3',
	MASK_LAST_6 = 'MASK-LAST-6',
	MASK_DAY = 'MASK-DAY',
	MASK_MONTH = 'MASK-MONTH',
	MASK_MONTH_DAY = 'MASK-MONTH-DAY'


class Factor(Storable, BaseModel):
	factorId: FactorId = None
	type: FactorType = None
	name: str = None
	enumId: EnumId = None
	label: str = None
	description: str = None
	defaultValue: str = None
	flatten: bool = False
	indexGroup: FactorIndexGroup = None
	encrypt: FactorEncryptMethod = None
	precision: str = None
