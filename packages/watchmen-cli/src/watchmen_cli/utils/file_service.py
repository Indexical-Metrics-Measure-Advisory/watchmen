from json import dump, load
from os import makedirs, PathLike
from pathlib import Path
from typing import Any, List, Union


def __get_path(site_name: str, model_name: str):
	return f'./temp/{model_name}/{site_name}'


def save_to_file(site_name: str, data_list: List[Any], model_name: str) -> None:
	path = __get_path(site_name, model_name)
	makedirs(path, exist_ok=True)
	with open(f'{path}/{model_name}.json', 'w') as outfile:
		dump(data_list, outfile)


def load_from_file(site_name: str, model_name: str) -> Any:
	path = __get_path(site_name, model_name)
	with open(f'{path}/{model_name}.json', 'r') as outfile:
		return load(outfile)


def create_file(path: str, file_name: str, data_list: List[Any]) -> None:
	with open(f'{path}/{file_name}.json', 'w') as outfile:
		dump(data_list, outfile)


def load_file_to_json(file: Union[str, PathLike]) -> Any:
	with open(file, 'r') as outfile:
		return load(outfile)


def load_folder(folder_path: str) -> Path:
	return Path(folder_path)


def create_folder(folder_path: str) -> None:
	makedirs(folder_path, exist_ok=True)
