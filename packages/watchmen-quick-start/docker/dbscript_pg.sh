#!/bin/bash

data_script_path=../../watchmen-storage-postgresql/data-scripts
meta_script_path=../../watchmen-storage-postgresql/meta-scripts
target_path=./postgres/init-scripts

if [ ! -d "${target_path}" ]; then
  mkdir -p "${target_path}"
fi

# Create subdirectories if they don't exist
mkdir -p "${target_path}/data-scripts"
mkdir -p "${target_path}/meta-scripts"

echo "Copying data scripts..."
cp -rf ${data_script_path}/* ${target_path}/data-scripts/

echo "Copying meta scripts..."
cp -rf ${meta_script_path}/* ${target_path}/meta-scripts/

echo "PostgreSQL scripts copied successfully."
