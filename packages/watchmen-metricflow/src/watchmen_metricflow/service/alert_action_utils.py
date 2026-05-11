from typing import Any, Dict, Optional


def is_manual_execution_action(action_or_dict: Any) -> bool:
    action_dict: Dict[str, Any] = {}
    if isinstance(action_or_dict, dict):
        action_dict = action_or_dict
    else:
        action_dict = _to_dict(action_or_dict)

    if bool(action_dict.get('manualExecution', False)):
        return True

    suggested = action_dict.get('suggestedAction') or {}
    suggested_mode = str(suggested.get('executionMode') or '').lower()
    if suggested_mode in {'manual', 'approval'}:
        return True

    execution_mode = str(action_dict.get('executionMode') or '').lower()
    if execution_mode in {'manual', 'approval'}:
        return True

    action_type = action_dict.get('actionType') or {}
    if bool(action_type.get('requiresApproval')):
        return True

    return False


def _to_dict(obj: Any) -> Dict[str, Any]:
    if obj is None:
        return {}
    if isinstance(obj, dict):
        return obj
    try:
        return obj.model_dump() if hasattr(obj, 'model_dump') else vars(obj)
    except Exception:
        return {}
