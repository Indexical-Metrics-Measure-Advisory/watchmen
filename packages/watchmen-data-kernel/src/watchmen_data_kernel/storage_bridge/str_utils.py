import re

SUPPORTED_FUNCTIONS = {
    'len': lambda s: len(s),
    'slice': lambda s, start=0, end='': s[int(start) if start else 0:int(end) if end else None],
    'find': lambda s, sub='': s.find(sub),
    'index': lambda s, sub: s.index(sub) if sub else -1,
    'startswith': lambda s, prefix='': s.startswith(prefix),
    'endswith': lambda s, suffix='': s.endswith(suffix),
    'strip': lambda s, chars=None: s.strip(chars) if chars else s.strip(),
    'replace': lambda s, old='', new='': s.replace(old, new),
    'upper': lambda s: s.upper(),
    'lower': lambda s: s.lower(),
    'contains': lambda s, sub='': sub in str(s),
    'split': lambda s, sub=',': s.split(sub)
}


def execute_string_operations(original_str, config_text):
    config_text = config_text.strip().replace(' ', '')
    func_list = config_text.split('|')
    result = original_str
    
    for func_item in func_list:
        match = re.match(r'^&(?P<func_name>\w+)(?:\((?P<params>.*)\))?$', func_item)
        if not match:
            raise ValueError(f"invalid config：{func_item}")
        
        func_name = match.group('func_name')
        params_str = match.group('params')
        
        if func_name not in SUPPORTED_FUNCTIONS:
            raise ValueError(f"not support function：{func_name}")
        
        params = []
        if params_str:
            params = [p.strip() for p in params_str.split(',')]
            if func_name not in ['split', 'slice']:
                for idx, param in enumerate(params):
                    if not param:
                        raise ValueError(f"invalid empty param at position {idx + 1} in {func_item}")
            
        func = SUPPORTED_FUNCTIONS[func_name]
        try:
            result = func(result, *params)
        except Exception as e:
            raise ValueError(f"func exec failed：{func_name}({params})，error：{str(e)}")
    
    return result


def check_supported_function_with_params(current_name) -> bool:
    pattern = r'&(?P<func_name>\w+)(?:\((?P<params>[^)]*)\))?'
    matches = re.finditer(pattern, current_name)
    has_match = False
    for match in matches:
        has_match = True
        func_name = match.group('func_name')
        if func_name not in SUPPORTED_FUNCTIONS:
            return False
    return has_match