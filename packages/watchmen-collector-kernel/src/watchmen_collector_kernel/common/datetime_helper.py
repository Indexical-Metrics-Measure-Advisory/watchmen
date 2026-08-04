from datetime import datetime
from typing import Union, Optional


def str_to_datetime(raw_val) -> Optional[Union[datetime, str]]:
    """
    Convert string to datetime object.
    Supported formats:
    1. yyyy-MM-dd HH:mm:ss
    2. yyyy-MM-ddTHH:mm:ss (ISO format)
    3. yyyy-MM-dd just date
    """
    if raw_val is None:
        return None
    
    if isinstance(raw_val, datetime):
        return raw_val

    if not isinstance(raw_val, str):
        return raw_val

    value = raw_val.strip()
    patterns = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d"
    ]

    for fmt in patterns:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    return raw_val
    