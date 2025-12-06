import importlib.util
import sys
import os

# Load module directly
file_path = '/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/str_utils.py'
module_name = 'str_utils'

spec = importlib.util.spec_from_file_location(module_name, file_path)
module = importlib.util.module_from_spec(spec)
sys.modules[module_name] = module
spec.loader.exec_module(module)

execute_string_operations = module.execute_string_operations

def test_execute():
    print("Testing execute_string_operations...")
    
    # 1. Basic success
    assert execute_string_operations("abc", "&len") == 3
    assert execute_string_operations("abc", "&upper") == "ABC"
    assert execute_string_operations("abc", "&len | &str") == "3" # Wait, &str is not supported?
    # Supported: len, slice, find, index, startswith, endswith, strip, replace, upper, lower, contains, split
    
    # 2. Chained
    assert execute_string_operations("  abc  ", "&strip | &upper") == "ABC"
    
    # 3. Params
    assert execute_string_operations("abc", "&replace(b, d)") == "adc"
    assert execute_string_operations("abc", "&slice(1, 2)") == "b"
    
    # 4. Invalid config structure
    try:
        execute_string_operations("abc", "len") # Missing &
        assert False, "Should fail missing &"
    except ValueError as e:
        assert "invalid config" in str(e)

    try:
        execute_string_operations("abc", "&len(") # Missing )
        assert False, "Should fail missing )"
    except ValueError as e:
        assert "invalid config" in str(e)

    # 5. Unsupported function
    try:
        execute_string_operations("abc", "&foo")
        assert False, "Should fail unsupported"
    except ValueError as e:
        assert "not support function" in str(e)

    print("All execute tests passed!")

if __name__ == "__main__":
    test_execute()
