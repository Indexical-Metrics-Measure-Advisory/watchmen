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

check_supported = module.check_supported_function_with_params
execute_ops = module.execute_string_operations

def test_all():
    print("Testing all functions...")
    
    # Check Supported
    assert check_supported("&len(abc)") == True
    assert check_supported("&unsupported") == False
    assert check_supported("&len(abc) &upper") == True
    assert check_supported("some text") == False
    
    # Execute Ops
    assert execute_ops("abc", "&len") == 3
    assert execute_ops("abc", "&upper") == "ABC"
    assert execute_ops("  abc  ", "&strip | &upper") == "ABC"
    assert execute_ops("abc", "&replace(b, d)") == "adc"
    
    # Execute Ops Errors
    try:
        execute_ops("abc", "len")
        assert False
    except ValueError as e:
        assert "invalid config" in str(e)
        
    try:
        execute_ops("abc", "&len(")
        assert False
    except ValueError as e:
        assert "invalid config" in str(e)
        
    try:
        execute_ops("abc", "&foo")
        assert False
    except ValueError as e:
        assert "not support function" in str(e)

    print("All tests passed!")

if __name__ == "__main__":
    test_all()
