import re

file_path = '/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-ai-copilot/src/watchmen_ai/mcp/router/pipeline_mcp_router.py'

with open(file_path, 'r') as f:
    content = f.read()

# Pattern to match lines with @router.post and add_action, capturing the tag part
# We want to replace tags=['mcp-pipeline'] with tags=['mcp-action']
# Only for lines containing "add_action"

lines = content.split('\n')
new_lines = []

for line in lines:
    if "add_action" in line and "tags=['mcp-pipeline']" in line:
        line = line.replace("tags=['mcp-pipeline']", "tags=['mcp-action']")
    
    # Also uncomment lines if they are commented out and contain add_action related code
    # This is a bit risky if not careful, but based on previous read, lines 442-480 were commented out.
    # The commented out lines started with "# " or "#"
    # I'll check if it looks like a commented out router decorator or function or class
    
    if line.strip().startswith("# @router.post") or \
       line.strip().startswith("# async def") or \
       line.strip().startswith("# class") or \
       line.strip().startswith("#     ") or \
       line.strip().startswith("# #") or \
       line.strip() == "#":
           
        # Heuristic: if it looks like code we want to uncomment
        # The block 442-480 contains delete actions and system actions.
        # We want to uncomment them AND update tags if it's a router line.
        
        # Strip the first "# " or "#"
        if line.startswith("# "):
            uncommented = line[2:]
        elif line.startswith("#"):
            uncommented = line[1:]
        else:
            uncommented = line
            
        # Check if this uncommented line is part of the blocks we want
        # The blocks are Delete Actions and System Actions
        # I'll use a flag or range check if possible, but line-by-line is harder.
        # However, looking at the content, I can just blindly uncomment lines that look like code in that area?
        # No, better to be specific.
        
        # Let's rely on string replacement for specific commented out lines that I saw.
        pass

    new_lines.append(line)

# Re-process to handle commented out blocks more safely.
# I will use replace for the active ones first.
content_v1 = '\n'.join(new_lines)

# Now uncomment the blocks.
# I will explicitly replace the commented out blocks with uncommented versions and updated tags.

commented_block_delete = """# # --- Delete Actions ---

# class AddDeleteRowActionRequest(AddActionRequestBase):
#     action: DeleteRowAction

# @router.post('/mcp/data_processing/add_action/delete_row', tags=['mcp-pipeline'], operation_id="add_delete_row_action", response_model=AddActionResponse)
# async def add_delete_row_action(request: AddDeleteRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
#     return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

# class AddDeleteRowsActionRequest(AddActionRequestBase):
#     action: DeleteRowsAction

# @router.post('/mcp/data_processing/add_action/delete_rows', tags=['mcp-pipeline'], operation_id="add_delete_rows_action", response_model=AddActionResponse)
# async def add_delete_rows_action(request: AddDeleteRowsActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
#     return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)"""

uncommented_block_delete = """# --- Delete Actions ---

class AddDeleteRowActionRequest(AddActionRequestBase):
    action: DeleteRowAction

@router.post('/mcp/data_processing/add_action/delete_row', tags=['mcp-action'], operation_id="add_delete_row_action", response_model=AddActionResponse)
async def add_delete_row_action(request: AddDeleteRowActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddDeleteRowsActionRequest(AddActionRequestBase):
    action: DeleteRowsAction

@router.post('/mcp/data_processing/add_action/delete_rows', tags=['mcp-action'], operation_id="add_delete_rows_action", response_model=AddActionResponse)
async def add_delete_rows_action(request: AddDeleteRowsActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)"""

commented_block_system = """# # --- System Actions ---

# class AddAlarmActionRequest(AddActionRequestBase):
#     action: AlarmAction

# @router.post('/mcp/data_processing/add_action/alarm', tags=['mcp-pipeline'], operation_id="add_alarm_action", response_model=AddActionResponse)
# async def add_alarm_action(request: AddAlarmActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
#     return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

# class AddCopyToMemoryActionRequest(AddActionRequestBase):
#     action: CopyToMemoryAction

# @router.post('/mcp/data_processing/add_action/copy_to_memory', tags=['mcp-pipeline'], operation_id="add_copy_to_memory_action", response_model=AddActionResponse)
# async def add_copy_to_memory_action(request: AddCopyToMemoryActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
#     return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

# class AddWriteToExternalActionRequest(AddActionRequestBase):
#     action: WriteToExternalAction

# @router.post('/mcp/data_processing/add_action/write_to_external', tags=['mcp-pipeline'], operation_id="add_write_to_external_action", response_model=AddActionResponse)
# async def add_write_to_external_action(request: AddWriteToExternalActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
#     return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)"""

uncommented_block_system = """# --- System Actions ---

class AddAlarmActionRequest(AddActionRequestBase):
    action: AlarmAction

@router.post('/mcp/data_processing/add_action/alarm', tags=['mcp-action'], operation_id="add_alarm_action", response_model=AddActionResponse)
async def add_alarm_action(request: AddAlarmActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddCopyToMemoryActionRequest(AddActionRequestBase):
    action: CopyToMemoryAction

@router.post('/mcp/data_processing/add_action/copy_to_memory', tags=['mcp-action'], operation_id="add_copy_to_memory_action", response_model=AddActionResponse)
async def add_copy_to_memory_action(request: AddCopyToMemoryActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)

class AddWriteToExternalActionRequest(AddActionRequestBase):
    action: WriteToExternalAction

@router.post('/mcp/data_processing/add_action/write_to_external', tags=['mcp-action'], operation_id="add_write_to_external_action", response_model=AddActionResponse)
async def add_write_to_external_action(request: AddWriteToExternalActionRequest, principal_service: PrincipalService = Depends(get_admin_principal)) -> AddActionResponse:
    return await _add_action_internal(request.pipeline_id, request.stage_name, request.unit_name, request.action, principal_service)"""

if commented_block_delete in content_v1:
    content_v1 = content_v1.replace(commented_block_delete, uncommented_block_delete)
else:
    print("Warning: Commented delete block not found exactly as expected.")

if commented_block_system in content_v1:
    content_v1 = content_v1.replace(commented_block_system, uncommented_block_system)
else:
    print("Warning: Commented system block not found exactly as expected.")

with open(file_path, 'w') as f:
    f.write(content_v1)

print("Updated pipeline_mcp_router.py")
