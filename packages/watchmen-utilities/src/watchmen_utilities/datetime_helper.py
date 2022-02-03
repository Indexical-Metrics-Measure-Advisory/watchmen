from datetime import date, datetime
from decimal import Decimal
from json import JSONEncoder


class DateTimeEncoder(JSONEncoder):
	def default(self, o):
		if isinstance(o, (datetime, date)):
			return o.isoformat()
		if isinstance(o, Decimal):
			return float(o)
		return super().default(o)


def get_current_time_seconds() -> datetime:
	return datetime.now().replace(tzinfo=None, microsecond=0)
