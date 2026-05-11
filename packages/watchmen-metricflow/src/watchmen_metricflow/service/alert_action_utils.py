import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def is_manual_execution_action(action_or_dict: Any) -> bool:
    action_dict: Dict[str, Any] = {}
    if isinstance(action_or_dict, dict):
        action_dict = action_or_dict
    else:
        action_dict = _to_dict(action_or_dict)

    action_id = action_dict.get('id')
    action_name = action_dict.get('name')

    if bool(action_dict.get('manualExecution', False)):
        logger.debug('[AlertActionUtils] manual=true by manualExecution field, action_id=%s, action_name=%s',
                     action_id, action_name)
        return True

    suggested = action_dict.get('suggestedAction') or {}
    suggested_mode = str(suggested.get('executionMode') or '').lower()
    if suggested_mode in {'manual', 'approval'}:
        logger.debug('[AlertActionUtils] manual=true by suggestedAction.executionMode=%s, action_id=%s, action_name=%s',
                     suggested_mode, action_id, action_name)
        return True

    execution_mode = str(action_dict.get('executionMode') or '').lower()
    if execution_mode in {'manual', 'approval'}:
        logger.debug('[AlertActionUtils] manual=true by executionMode=%s, action_id=%s, action_name=%s',
                     execution_mode, action_id, action_name)
        return True

    action_type = action_dict.get('actionType') or {}
    if bool(action_type.get('requiresApproval')):
        logger.debug('[AlertActionUtils] manual=true by actionType.requiresApproval=true, action_id=%s, action_name=%s',
                     action_id, action_name)
        return True

    logger.debug('[AlertActionUtils] manual=false (no field matched), action_id=%s, action_name=%s',
                 action_id, action_name)
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
