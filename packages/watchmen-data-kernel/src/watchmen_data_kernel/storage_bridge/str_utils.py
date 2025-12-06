
from enum import Enum


class StringOperationType(str, Enum):
    LEN = 'len'
    SLICE = 'slice'
    FIND = 'find'
    INDEX = 'index'
    STARTSWITH = 'startswith'
    ENDSWITH = 'endswith'
    STRIP = 'strip'
    REPLACE = 'replace'
    UPPER = 'upper'
    LOWER = 'lower'
    CONTAINS = 'contains'
    SPLIT = 'split'


SUPPORTED_FUNCTIONS = {
    StringOperationType.LEN: lambda s: len(s),
    StringOperationType.SLICE: lambda s, start=0, end='': s[int(start) if start else 0:int(end) if end else None],
    StringOperationType.FIND: lambda s, sub='': s.find(sub),
    StringOperationType.INDEX: lambda s, sub: s.index(sub) if sub else -1,
    StringOperationType.STARTSWITH: lambda s, prefix='': s.startswith(prefix),
    StringOperationType.ENDSWITH: lambda s, suffix='': s.endswith(suffix),
    StringOperationType.STRIP: lambda s, chars=None: s.strip(chars) if chars else s.strip(),
    StringOperationType.REPLACE: lambda s, old='', new='': s.replace(old, new),
    StringOperationType.UPPER: lambda s: s.upper(),
    StringOperationType.LOWER: lambda s: s.lower(),
    StringOperationType.CONTAINS: lambda s, sub='': sub in str(s),
    StringOperationType.SPLIT: lambda s, sub=',': s.split(sub)
}


def execute_string_operations(original_str, config_text: str):
    """
    Execute a chain of string operations defined in config_text on original_str.
    Format: &func1(params) | &func2
    """
    if not config_text:
        return original_str
        
    config_text = config_text.strip().replace(' ', '')
    if not config_text:
        return original_str
        
    func_list = config_text.split('|')
    result = original_str
    
    for func_item in func_list:
        if not func_item:
             # Handle empty items from "||" or trailing "|"
             continue
             
        if not func_item.startswith('&'):
            raise ValueError(f"invalid config：{func_item}")
            
        paren_start = func_item.find('(')
        if paren_start != -1:
            if not func_item.endswith(')'):
                raise ValueError(f"invalid config：{func_item}")
            func_name = func_item[1:paren_start]
            params_str = func_item[paren_start+1:-1]
        else:
            func_name = func_item[1:]
            params_str = None
        
        if func_name not in SUPPORTED_FUNCTIONS:
            raise ValueError(f"not support function：{func_name}")
        
        params = []
        if params_str:
            params = [p.strip() for p in params_str.split(',')]
            if func_name not in [StringOperationType.SPLIT, StringOperationType.SLICE, StringOperationType.REPLACE]:
                for idx, param in enumerate(params):
                    if not param:
                        raise ValueError(f"invalid empty param at position {idx + 1} in {func_item}")
            
        func = SUPPORTED_FUNCTIONS[func_name]
        try:
            result = func(result, *params)
        except Exception as e:
            raise ValueError(f"func exec failed：{func_name}({params})，error：{str(e)}")
    
    return result


def check_supported_function_with_params(current_name: str) -> bool:
    """
    Check if the given string contains valid supported function calls.
    Format: &funcName or &funcName(params)
    """
    start = 0
    length = len(current_name)
    has_match = False

    while True:
        idx = current_name.find('&', start)
        if idx == -1:
            break

        # Extract function name
        func_start = idx + 1
        func_end = func_start
        
        # Fast scan for identifier end (alphanumeric or _)
        while func_end < length:
            char = current_name[func_end]
            # Check for a-z, A-Z, 0-9, _
            # ASCII comparison is faster than isalnum()
            if not (('a' <= char <= 'z') or 
                    ('A' <= char <= 'Z') or 
                    ('0' <= char <= '9') or 
                    char == '_'):
                break
            func_end += 1

        if func_end == func_start:
            start = idx + 1
            continue

        func_name = current_name[func_start:func_end]

        if func_name not in SUPPORTED_FUNCTIONS:
            return False

        has_match = True

        # Skip parameters if present
        next_pos = func_end
        if next_pos < length and current_name[next_pos] == '(':
            close_paren_idx = current_name.find(')', next_pos + 1)
            if close_paren_idx != -1:
                next_pos = close_paren_idx + 1

        start = next_pos

    return has_match