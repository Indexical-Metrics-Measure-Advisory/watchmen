from datetime import datetime, date, time
from decimal import Decimal, InvalidOperation
from logging import getLogger
from typing import Any, List, Dict, Tuple, Union

from watchmen_data_kernel.common.settings import ask_all_datetime_formats, ask_date_formats, ask_time_formats
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Topic, Factor, FactorType
from watchmen_utilities import ArrayHelper, is_datetime, is_time

logger = getLogger(__name__)


def parse_from_instance_json(topic: Topic, data_: List) -> Topic:
    existed_factors: List[Factor] = topic.factors
    existed_factors_map = {item.name: item for item in existed_factors}
    factors = to_factors_from_instance_data(topic, existed_factors_map, data_)
    topic.factors = factors
    return topic
    
    
def create_initial_factor(name: str) -> Factor:
    return Factor(
        factorId=str(ask_snowflake_generator().next_id()),
        name=name,
        type=None
    )


def  to_factors_from_instance_data(topic: Topic, factors_map: Dict[str, Factor], json_data: Any, prefix: str=None) -> List[Factor]:
    
    if json_data is None or not isinstance(json_data, list) or len(json_data) == 0:
        logger.error(f'Cannot parse data to factors. {json_data}')
        raise ValueError('Parsed data is not an array or no element in factors array.')
        
    for row in json_data:
        if not isinstance(row, dict) or row is None:
            continue
        if prefix is not None:
            # if there is prefix, create auto-generated id for referring to ancestors
            ancestors = prefix.split('.')
            ancestors_count = len(ancestors)
            if ancestors_count > 1:
                for index, ancestor in enumerate(ancestors):
                    if index == ancestors_count - 1:
                        # this is me, ignored.
                        continue
                    factor_name = f"{prefix}.aid_{ancestor}"
                    
                    # Extract all levels after the current node (convert to uppercase) and check for duplicates
                    tails = [x.upper() for x in ancestors if ancestors.index(x) > index]
                    if ancestor.upper() in tails:
                        # there is duplication, eg.a.b.c.b.e, now we are in first "b", and there is another "b" following.
                        # use distance as suffix
                        factor_name = f"{factor_name}_{ancestors_count - 1 - index}"
                    
                    factor = factors_map.get(factor_name) or create_initial_factor(factor_name)
                    # Build description information: concatenate the current ancestor path
                    ancestor_name = '.'.join(ancestors[:index + 1])
                    factor.description = f"Auto generated id refers to {ancestor_name}.aid_me"
                    factors_map[factor_name] = factor
                
        for name, value in row.items():
            factor_name = f"{prefix}.{name}" if prefix is not None else name
            factor = factors_map.get(factor_name) or create_initial_factor(factor_name)
            if value is None:
                continue
            elif isinstance(value, (int, float, Decimal)):
                if factor.type is None:
                    factor.type = FactorType.NUMBER
                elif factor.type not in (FactorType.TEXT, FactorType.NUMBER):
                    raise ValueError(
                        f"Conflict type[{FactorType.NUMBER.value}, {factor.type.value}] detected on factor[{factor_name}]."
                    )
            elif isinstance(value, bool):
                if factor.type is None:
                    factor.type = FactorType.BOOLEAN
                elif factor.type != FactorType.BOOLEAN:
                    raise ValueError(
                        f"Conflict type[{FactorType.BOOLEAN.value}, {factor.type.value}] detected on factor[{factor_name}]."
                    )
            elif isinstance(value, str):
                trimmed_val = value.strip()
                data_type = convert_str_to_target_type(trimmed_val)
                if data_type == FactorType.NUMBER:
                    if factor.type not in (FactorType.OBJECT, FactorType.ARRAY):
                        factor.type = FactorType.TEXT
                    else:
                        logger.error(
                            f"Conflict type[{data_type}, {trimmed_val}] detected on factor[{factor_name}]."
                        )
                        pass
                elif data_type == FactorType.DATETIME:
                    if factor.type is None:
                        factor.type = FactorType.FULL_DATETIME
                    elif factor.type != FactorType.FULL_DATETIME:
                        factor.type = FactorType.TEXT
                elif data_type == FactorType.DATE:
                    if factor.type is None:
                        factor.type = FactorType.DATETIME
                    elif factor.type != FactorType.DATE:
                        factor.type = FactorType.TEXT
                elif data_type == FactorType.TIME:
                    if factor.type is None:
                        factor.type = FactorType.TIME
                    elif factor.type != FactorType.TIME:
                        factor.type = FactorType.TEXT
                elif data_type == FactorType.TEXT:
                    if factor.type not in (FactorType.OBJECT, FactorType.ARRAY):
                        factor.type = FactorType.TEXT
                    else:
                        logger.error(
                            f"Conflict type[{data_type}, {trimmed_val}] detected on factor[{factor_name}]."
                        )
                        pass
            elif isinstance(value, List):
                if factor.type is None:
                    factor.type = FactorType.ARRAY
                elif factor.type != FactorType.ARRAY:
                    logger.error(
                        f"Conflict type[{factor.type}, {value}] detected on factor[{factor_name}]."
                    )
                    factor.type = FactorType.ARRAY
                    
                if len(value) != 0:
                    # Create the aid_me factor
                    create_aid_factor(factor_name, factors_map, topic, "Auto generated id for sub object referring.")
                    # Create the aid_root factor
                    create_aid_factor(factor_name, factors_map, topic, "Auto generated id for reference to root.", True)
                    # Recursively process array elements to generate Factor
                    sub_factors = to_factors_from_instance_data(topic, value, factor_name)
                    for sub_factor in sub_factors:
                        factors_map[sub_factor.name] = sub_factor
            elif isinstance(value, dict):
                if factor.type is None:
                    factor.type = FactorType.OBJECT
                elif factor.type != FactorType.OBJECT:
                    raise ValueError(
                        f"Conflict type[{FactorType.OBJECT.value}, {factor.type.value}] detected on factor[{factor_name}]."
                    )
                # Create the aid_me factor
                create_aid_factor(factor_name, factors_map, topic, "Auto generated id for sub object referring.")
                # Create the aid_root factor
                create_aid_factor(factor_name, factors_map, topic, "Auto generated id for reference to root.", True)
                # Recursively process array elements to generate Factor
                sub_factors = to_factors_from_instance_data(topic, [value], factor_name)
                for sub_factor in sub_factors:
                    factors_map[sub_factor.name] = sub_factor
            
            factors_map[factor_name] = factor
            
    factor_list = list(factors_map.values())
    
    def sort_factor(f: Factor) -> str:
        """Sorting key: convert to uppercase, ignore case"""
        return f.name.upper()
    
    factor_list.sort(key=sort_factor)
    
    # Complete the type as TEXT
    for factor in factor_list:
        if factor.type is None:
            factor.type = FactorType.TEXT
    
    return factor_list
    

def convert_str_to_target_type(s: str) -> FactorType:
    # priority 1：convert to Decimal
    is_decimal_, result_ = convert_str_to_decimal(s)
    if is_decimal_:
        return FactorType.NUMBER
    
    # priority 2：convert to datetime
    is_datetime_, result_ = convert_str_to_datetime(s)
    if is_datetime_:
        return FactorType.DATETIME
    
    # priority 3 ：convert to date
    is_date_, result_ = convert_str_to_date(s)
    if is_date_:
        return FactorType.DATE
        
    # priority 4：convert to time
    is_time_, result_ = convert_str_to_time(s)
    if is_time_:
        return FactorType.TIME
        
    # just TEXT
    return FactorType.TEXT
    


def convert_str_to_decimal(s: str) -> Tuple[bool, Union[Decimal, str]]:
    try:
        return True, Decimal(s)
    except InvalidOperation:
        return False, s


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


def convert_str_to_time(s: str) -> Tuple[bool, Union[time, str]]:
    try:
        parsed, result = is_time(s, ask_time_formats())
        if parsed:
            return True, result
        else:
            return False, s
    except (ValueError, TypeError):
        return False, s


def create_aid_factor(prefix: str, factors: Dict, topic: Topic, description: str, is_root: bool=False) -> None:
    if is_root:
        factor_name = f"{prefix}.aid_root"
    else:
        factor_name = f"{prefix}.aid_me"
    factor = factors.get(factor_name) or create_initial_factor(factor_name)
    factor.name = factor_name
    factor.type = FactorType.NUMBER
    factor.description = description
    factors[factor_name] = factor
