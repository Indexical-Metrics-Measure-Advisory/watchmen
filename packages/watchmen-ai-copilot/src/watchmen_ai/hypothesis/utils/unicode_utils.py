import re
from typing import Any, Dict, List, Union


def sanitize_unicode_for_mysql(text: str) -> str:
    """
    Sanitize Unicode text for MySQL storage by removing 4-byte UTF-8 characters (emojis, etc.)
    that are not supported by MySQL's utf8 charset.
    
    Args:
        text: The input text to sanitize
        
    Returns:
        Sanitized text with 4-byte UTF-8 characters removed
    """
    if not isinstance(text, str):
        return text
    
    # Remove 4-byte UTF-8 characters (emojis and other extended Unicode)
    # This regex matches characters outside the Basic Multilingual Plane
    sanitized = re.sub(r'[\U00010000-\U0010FFFF]', '', text)
    
    # Also remove any other problematic characters that might cause issues
    # Remove null bytes and other control characters except common ones
    sanitized = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', sanitized)
    
    return sanitized


def sanitize_dict_unicode(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively sanitize Unicode characters in a dictionary.
    
    Args:
        data: Dictionary to sanitize
        
    Returns:
        Dictionary with sanitized Unicode strings
    """
    if not isinstance(data, dict):
        return data
    
    sanitized = {}
    for key, value in data.items():
        if isinstance(value, str):
            sanitized[key] = sanitize_unicode_for_mysql(value)
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict_unicode(value)
        elif isinstance(value, list):
            sanitized[key] = sanitize_list_unicode(value)
        else:
            sanitized[key] = value
    
    return sanitized


def sanitize_list_unicode(data: List[Any]) -> List[Any]:
    """
    Recursively sanitize Unicode characters in a list.
    
    Args:
        data: List to sanitize
        
    Returns:
        List with sanitized Unicode strings
    """
    if not isinstance(data, list):
        return data
    
    sanitized = []
    for item in data:
        if isinstance(item, str):
            sanitized.append(sanitize_unicode_for_mysql(item))
        elif isinstance(item, dict):
            sanitized.append(sanitize_dict_unicode(item))
        elif isinstance(item, list):
            sanitized.append(sanitize_list_unicode(item))
        else:
            sanitized.append(item)
    
    return sanitized


def sanitize_object_unicode(obj: Any) -> Any:
    """
    Sanitize Unicode characters in any object (dict, list, or string).
    
    Args:
        obj: Object to sanitize
        
    Returns:
        Object with sanitized Unicode strings
    """
    if isinstance(obj, str):
        return sanitize_unicode_for_mysql(obj)
    elif isinstance(obj, dict):
        return sanitize_dict_unicode(obj)
    elif isinstance(obj, list):
        return sanitize_list_unicode(obj)
    else:
        return obj