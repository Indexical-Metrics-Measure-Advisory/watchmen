import json
from typing import List, Dict

KEYWORDS = "keywords"

TYPE = "type"

LEVEL = "level"

CHILDREN = "children"


def get_all_document_nodes(markdown_json: json) -> List:
    children = markdown_json[CHILDREN]
    return children


def process_key_words(meta_info: Dict):
    new_meta = meta_info.copy()
    if KEYWORDS in new_meta:
        keywords = new_meta[KEYWORDS]
        keywords_list = keywords.split(",")
        new_meta[KEYWORDS] = keywords_list
        return new_meta


def find_name_for_document(children: List) -> str:
    for child in children:
        if child.get(TYPE) == "Heading" and child.get(LEVEL) == 1:
            raw_text_body = child.get(CHILDREN)[0]
            if raw_text_body.get(TYPE) == "RawText":
                return raw_text_body.get("content")
            else:
                raise Exception("Document name not found")
        else:
            raise Exception("Document name not found")
