import sys
import re
import os
import json
from enum import Enum

version_pattern = re.compile('^version = "16\.[0-9]{1,2}\.[0-9]{1,2}(\.RELEASE)?"$')
dependency_pattern = re.compile('^watchmen-[a-zA-Z]+(-[a-zA-Z]+)? = { path = ".+", develop = true }$')
dependency_optional_pattern = re.compile(
    '^watchmen-[a-zA-Z]+(-[a-zA-Z]+)? = { path = ".+", develop = true, optional = true }$')

poetry_file_name = "pyproject.toml"
package_json = "package.json"


class FileType(str, Enum):
    TOML = "toml"
    JSON = "json"


def find_all_file(base_dir: str) -> (str, FileType):
    for root, ds, fs in os.walk(base_dir):
        for f in fs:
            if f == poetry_file_name:
                fullname = os.path.join(root, f)
                yield fullname, FileType.TOML
            elif f == package_json:
                fullname = os.path.join(root, f)
                yield fullname, FileType.JSON


def change_package_json(name_: str, version: str):
    with open(name_, "r", encoding="utf-8") as file:
        text = json.load(file)
        text["version"] = version
        file_data = text
    with open(name_, "w", encoding="utf-8") as file:
        json.dump(file_data, file)


def change_poetry_toml(name_: str, version: str):
    file_data = ""
    with open(name_, "r", encoding="utf-8") as file:
        for line in file:
            line = match_pattern(line, version)
            file_data += line
    with open(name_, "w", encoding="utf-8") as file:
        file.write(file_data)


def match_pattern(text: str, version) -> str:
    if re.match(version_pattern, text, flags=0):
        return change_package_version(version)
    elif re.match(dependency_pattern, text, flags=0):
        return change_dependency_version(text, version, False)
    elif re.match(dependency_optional_pattern, text, flags=0):
        return change_dependency_version(text, version, True)
    else:
        return text


def change_package_version(version: str) -> str:
    replace = f"version = \"{version}\"\n"
    return replace


def change_dependency_version(text: str, version: str, with_optional: bool) -> str:
    dependency = text.split("=")[0].strip()
    if with_optional:
        return f"{dependency} = {{ version = \"{version}\", optional = true }}\n"
    else:
        return f"{dependency} = \"{version}\"\n"


if __name__ == "__main__":
    version_ = sys.argv[1]
    base = "./packages/"
    for file_name, file_type in find_all_file(base):
        if file_type == FileType.TOML:
            change_poetry_toml(file_name, version_)
        elif file_type == FileType.JSON:
            change_package_json(file_name, version_)
