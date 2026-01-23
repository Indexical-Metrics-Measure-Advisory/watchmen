
from datetime import date, datetime, time
from decimal import Decimal, InvalidOperation
from typing import Any, Callable, Optional, Tuple, Union, TypeVar

from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.common.settings import ask_all_datetime_formats, ask_time_formats, ask_date_formats
from watchmen_utilities import ExtendedBaseModel, is_datetime, is_time

"""
Supports multiple formats: decimal/datetime/date/time.
No element is considered returning `none`,
When calculating the minimum value, `none` and empty string are considered the minimum value `none`.
When calculating the maximum value, `none` and empty string are always ignored.
Blank string always leads an error,
Only the extreme value of a single type will be calculated. If the data contains multiple types, an error will be reported.
Unless it only contains both `datetime` and `date` simultaneously.
In this case, the `datetime` data will be downgraded to `date`, and the calculated extreme value will also be of the `date` type.
String values will be automatically converted to the detected type. If the conversion fails, an error will be reported.
If there are no explicit values of the four types and `none`,
but there are string values, the conversion will be carried out in the priority order of
decimal > datetime > date > time, and the compatibility rules are the same as above.
Note that once `date` is detected, the already detected `datetime` will also be downgraded.
"""

SupportedExtremumTypes = Union[date, datetime, time, Decimal]


T = TypeVar('T', bound=SupportedExtremumTypes)


class State(ExtendedBaseModel):
    name: str = None
    current_name: str = None
    value: Optional[Any] = None
    has_decimal: bool = False
    extremum_decimal: Optional[Decimal] = None
    has_datetime: bool = False
    extremum_datetime: Optional[datetime] = None
    has_date: bool = False
    extremum_date: Optional[date] = None
    has_time: bool = False
    extremum_time: Optional[time] = None


def min_value(name: str, current_name: str, data_: Any) -> Optional[Union[Decimal, date, time]]:
    return calculate_extremum_value(name, current_name, data_, min)


def max_value(name: str, current_name: str, data_: Any) -> Optional[Union[Decimal, date, time]]:
    return calculate_extremum_value(name, current_name, data_, max)


def get_result(state: State) -> Optional[Union[Decimal, datetime, date, time]]:
    if state.has_decimal:
        return state.extremum_decimal
    elif state.has_date:
        return state.extremum_date
    elif state.has_datetime:
        return state.extremum_datetime
    elif state.has_time:
        return state.extremum_time
    else:
        return None


def calculate_extremum_value(name: str, current_name: str, data: Any, extremum_func: Callable[[T, T], T]) -> Optional[Union[Decimal, datetime, date, time]]:
    if isinstance(data, str):
        return None if data.strip() == "" else data
    elif isinstance(data, list):
        state = State(
            name=name, current_name=current_name, value=data,
            has_decimal=False, extremum_decimal=None,
            has_datetime=False, extremum_datetime=None,
            has_date=False, extremum_date=None,
            has_time=False, extremum_time=None
        )
        for value in data:
            if value is None:
                func_name = extremum_func.__name__
                match func_name:
                    case "min":
                        return None
                    case "max":
                        continue
                    case _:
                        raise ValueError(f'Invalid function name: {func_name}')
            else:
                if isinstance(value, int):
                    exchange_with_decimal(Decimal(value), state, extremum_func)
                elif isinstance(value, float):
                    exchange_with_decimal(Decimal(str(value)), state, extremum_func)
                elif isinstance(value, Decimal):
                    exchange_with_decimal(value, state, extremum_func)
                elif isinstance(value, datetime):
                    exchange_with_datetime(value, state, extremum_func)
                elif isinstance(value, date):
                    exchange_with_date(value, state, extremum_func)
                elif isinstance(value, time):
                    exchange_with_time(value, state, extremum_func)
                elif isinstance(value, str):
                    if value == "":
                        func_name = extremum_func.__name__
                        match func_name:
                            case "min":
                                return None
                            case "max":
                                continue
                            case _:
                                raise ValueError(f'Invalid function name: {func_name}')
                    if len(value.strip()) == 0:
                        raise DataKernelException(
                            f'Invalid blank string value for extremum function:[key={name}, current={current_name}] from [{data}].'
                        )
                    convert_str_to_target_type(value, state, extremum_func)
                else:
                    raise DataKernelException(
                        f'Invalid value {value} for extremum function:[key={name}, current={current_name}] from [{data}].'
                    )
        return get_result(state)
    else:
        raise DataKernelException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')


def convert_str_to_target_type(s: str, state: State, extremum_func: Callable[[T, T], T]) -> Tuple[bool, Union[Decimal, datetime, date, time, Any]]:
    # priority 1：convert to Decimal
    is_decimal_, result_ = convert_str_to_decimal(s)
    if is_decimal_:
        if exchange_with_decimal(result_, state, extremum_func):
            return True, result_

    # priority 2：convert to datetime
    is_datetime_, result_ = convert_str_to_datetime(s)
    if is_datetime_:
        if exchange_with_datetime(result_, state, extremum_func):
            return True, result_
    
    # priority 3 ：convert to date
    is_date_, result_ = convert_str_to_date(s)
    if is_date_:
        if exchange_with_date(result_, state, extremum_func):
            return True, result_

    # priority 4：convert to time
    is_time_, result_ = convert_str_to_time(s)
    if is_time_:
        if exchange_with_time(result_, state, extremum_func):
            return True, result_
 
    # all convert failed
    raise ValueError(f"String [{s}] cannot be converted to any supported type (decimal/datetime/date/time),"
                     f"Type mismatch in MIN function:[key={state.name}, current={state.current_name}] from [{state.value}]")


def convert_str_to_decimal(s: str) -> Tuple[bool, Union[Decimal, str]]:
    try:
        return True, Decimal(s)
    except InvalidOperation:
        return False, s

def exchange_with_decimal(value: Decimal, state: State, extremum_func: Callable[[T, T], T]) -> bool:
    if state.has_datetime or state.has_date or state.has_time:
        raise DataKernelException(
            f'Type mismatch in extremum function:[key={state.name}, current={state.current_name}] from [{state.value}].'
        )
    else:
        state.has_decimal = True
        state.extremum_decimal = value if state.extremum_decimal is None else extremum_func(state.extremum_decimal, value)
        return True


def convert_str_to_datetime(s: str) -> Tuple[bool, Union[datetime, str]]:
    try:
        parsed, result = is_datetime(s, ask_all_datetime_formats())
        if parsed:
            if result.hour == 0 and result.minute == 0 and result.second == 0 and result.microsecond == 0:
                return False, s
            else:
                return True, result
        else:
            return False, s
    except (ValueError, TypeError):
        return False, s
    

def exchange_with_datetime(value: datetime, state: State, extremum_func: Callable[[T, T], T]) -> bool:
    if state.has_decimal or state.has_time:
        raise DataKernelException(
            f'Type mismatch in extremum function:[key={state.name}, current={state.current_name}] from [{state.value}].'
        )
    else:
        state.has_datetime = True
        state.extremum_datetime = value if state.extremum_datetime is None else extremum_func(state.extremum_datetime, value)
        state.extremum_date = value.date() if state.extremum_date is None else extremum_func(state.extremum_date, value.date())
        return True


def convert_str_to_date(s: str) -> Tuple[bool, Union[date, str]]:
    try:
        parsed, result = is_datetime(s, ask_date_formats())
        if parsed:
            if result.hour == 0 and result.minute == 0 and result.second == 0 and result.microsecond == 0:
                return True, result.date()
            else:
                return False, s
        else:
            return False, s
    except (ValueError, TypeError):
        return False, s
    

def exchange_with_date(value: date, state: State, extremum_func: Callable[[T, T], T]) -> bool:
    if state.has_decimal or state.has_time:
        raise DataKernelException(
            f'Type mismatch in extremum function:[key={state.name}, current={state.current_name}] from [{state.value}].'
        )
    else:
        state.has_date = True
        state.extremum_date = value if state.extremum_date is None else extremum_func(state.extremum_date, value)
        return True


def convert_str_to_time(s: str) -> Tuple[bool, Union[time, str]]:
    try:
        parsed, result = is_time(s, ask_time_formats())
        if parsed:
            return True, result
        else:
            return False, s
    except (ValueError, TypeError):
        return False, s


def exchange_with_time(value: time, state: State, extremum_func: Callable[[T, T], T]) -> bool:
    if state.has_decimal or state.has_datetime or state.has_date:
        raise DataKernelException(
            f'Type mismatch in extremum function:[key={state.name}, current={state.current_name}] from [{state.value}].'
        )
    else:
        state.has_time = True
        state.extremum_time = value if state.extremum_time is None else extremum_func(state.extremum_time, value)
        return True

