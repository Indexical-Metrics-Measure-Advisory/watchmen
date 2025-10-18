#!/usr/bin/env python3
"""
Simple test script to verify Unicode sanitization functionality.
"""

from unicode_utils import sanitize_unicode_for_mysql, sanitize_object_unicode


def test_unicode_sanitization():
    """Test Unicode sanitization functions."""
    
    # Test string with emoji (4-byte UTF-8)
    test_string = "📌 Analysis report with emoji 🚀 and normal text"
    sanitized = sanitize_unicode_for_mysql(test_string)
    print(f"Original: {test_string}")
    print(f"Sanitized: {sanitized}")
    print(f"Length changed: {len(test_string)} -> {len(sanitized)}")
    print()
    
    # Test dictionary with Unicode content
    test_dict = {
        "content": "📌 Analysis report with emoji 🚀",
        "title": "Normal title",
        "nested": {
            "description": "🔍 Nested content with emoji"
        },
        "list_data": ["📊 Item 1", "Normal item 2", "🎯 Item 3"]
    }
    
    sanitized_dict = sanitize_object_unicode(test_dict)
    print("Original dict:")
    for key, value in test_dict.items():
        print(f"  {key}: {value}")
    
    print("\nSanitized dict:")
    for key, value in sanitized_dict.items():
        print(f"  {key}: {value}")
    
    print("\nTest completed successfully!")


if __name__ == "__main__":
    test_unicode_sanitization()