import importlib.util
import sys
import os

# Load module directly to avoid package dependency issues
file_path = '/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/str_utils.py'
module_name = 'str_utils'

spec = importlib.util.spec_from_file_location(module_name, file_path)
module = importlib.util.module_from_spec(spec)
sys.modules[module_name] = module
spec.loader.exec_module(module)

check_supported_function_with_params = module.check_supported_function_with_params

def test_cases():
    cases = [
        ("&len(abc)", True),
        ("&unsupported(abc)", False),
        ("&len(abc) &unsupported(def)", False),
        ("some text", False),
        ("&len(abc) &upper", True),
        ("&len", True),  # Function without parens
        ("&len &upper", True),
        ("&len(abc) &upper()", True),
        ("&len(a&b)", True), # & inside parens should be treated as param, not new function start?
        # Wait, regex `[^)]*` stops at first `)`.
        # If input is `&len(a&b)`, `[^)]*` matches `a&b`. So valid.
        
        ("&len(a) &upper(b)", True),
        ("&len(a) &unsupported", False),
        ("prefix &len suffix", True),
        ("&", False),
        ("& ", False),
        ("&(", False)
    ]
    
    print("Running tests...")
    failed = False
    for input_str, expected in cases:
        result = check_supported_function_with_params(input_str)
        if result != expected:
            print(f"FAILED: input='{input_str}', expected={expected}, got={result}")
            failed = True
        else:
            print(f"PASSED: input='{input_str}'")
            
    if not failed:
        print("All tests passed!")
    else:
        sys.exit(1)

if __name__ == "__main__":
    test_cases()
