import importlib.util
import sys

# Load module directly
file_path = '/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-data-kernel/src/watchmen_data_kernel/storage_bridge/str_utils.py'
module_name = 'str_utils'

spec = importlib.util.spec_from_file_location(module_name, file_path)
module = importlib.util.module_from_spec(spec)
sys.modules[module_name] = module
spec.loader.exec_module(module)

check_supported = module.check_supported_function_with_params
execute_ops = module.execute_string_operations

def test_final():
    print("Testing final implementation...")
    
    # Check Supported - Functionality
    assert check_supported("&len(abc)") == True
    assert check_supported("&unsupported") == False
    assert check_supported("&len(abc) &upper") == True
    assert check_supported("some text") == False
    assert check_supported("&len_") == False # Underscore allowed in name parsing, but not in SUPPORTED_FUNCTIONS keys
    
    # Edge cases
    assert check_supported("&") == False
    assert check_supported("& ") == False
    assert check_supported("&(abc)") == False
    
    # Execute Ops - Functionality
    assert execute_ops("abc", "&len") == 3
    assert execute_ops("abc", "&upper") == "ABC"
    assert execute_ops("abc", "") == "abc"
    assert execute_ops("abc", "  ") == "abc"
    assert execute_ops("abc", "&upper |") == "ABC" # Trailing pipe
    
    print("All final tests passed!")

if __name__ == "__main__":
    test_final()
