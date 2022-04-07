#!/bin/bash

path=$GITHUB_WORKSPACE$INPUT_FILEPATH

if [ $INPUT_FILETYPE=="toml" ]; then
  python change_poetry_toml.py $INPUT_VERSION $path
fi

if [ $INPUT_FILETYPE=="json" ]; then
  python change_package_json.py $INPUT_VERSION $path
fi

cd $path
python -m pip install --upgrade pip
pip install poetry
poetry build
poetry publish -u $INPUT_PIP_USERNAME -p $INPUT_PIP_PASSWORD