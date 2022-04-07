import json
import os
import re
import sys

version_pattern = re.compile('^version = "16\.[0-9]{1,2}\.[0-9]{1,2}(\.RELEASE)?"$')
package_json = "package.json"


def change_package_json(name_: str, version: str):
	with open(name_, "r", encoding="utf-8") as file:
		text = json.load(file)
		text["version"] = version
		file_data = text
	with open(name_, "w", encoding="utf-8") as file:
		json.dump(file_data, file)


def match_pattern(text: str, version) -> str:
	if re.match(version_pattern, text, flags=0):
		return change_package_version(version)
	else:
		return text


def change_package_version(version: str) -> str:
	replace = f"version = \"{version}\"\n"
	return replace


if __name__ == "__main__":
	version_ = sys.argv[1]
	path = sys.argv[2]
	file_name = os.path.join(path, package_json)
	change_package_json(file_name, version_)
