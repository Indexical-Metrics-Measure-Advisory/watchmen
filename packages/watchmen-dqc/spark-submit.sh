#!/bin/bash

# 1. Base path configuration
REPO_ROOT="/Users/yifeng/Documents/git_watchmen/watchmen"
# Source code ZIP bundle for Spark executor distribution
PYFILES_ZIP="/var/folders/0w/glwlqmt106l8rj_zfhzyjfhc0000gn/T/watchmen_spark_pyfiles_qgtknd5i.zip"
# Entry point for the Spark executor
EXECUTOR_PY="$REPO_ROOT/packages/watchmen-dqc/src/watchmen_dqc/monitor/spark/spark_executor.py"
# Environment variables file
ENV_FILE="$REPO_ROOT/packages/watchmen-rest-dqc/.env"

# 2. Get the Python path from the Poetry virtual environment
# This ensures that both Driver and Executor use the libraries in the virtual environment (including pydantic_core, etc.)
POETRY_PYTHON=$(poetry env info -p)/bin/python

# 3. Automatically parse .env and construct Spark --conf parameters for metadata storage configuration
CONF_ARGS=()
if [ -f "$ENV_FILE" ]; then
  while IFS='=' read -r key value; do
    # Propagate metadata storage and Watchmen related environment variables
    if [[ $key =~ ^(META_STORAGE_|WATCHMEN_|MONITOR_RULES_RUNNER_ENGINE) ]]; then
      # Remove potential quotes
      value=$(echo "$value" | sed "s/['\"]//g")
      CONF_ARGS+=("--conf" "spark.executorEnv.$key=$value")
    fi
  done < <(grep -v '^#' "$ENV_FILE" | grep '=')
fi

# 4. Execute submission using poetry run
# Note: External libraries are handled by the Poetry environment, so no manual SPARK_LIBS is needed
poetry run spark-submit \
  --master "local[*]" \
  --deploy-mode client \
  --driver-memory 4g \
  --executor-memory 4g \
  --py-files "$PYFILES_ZIP" \
  "${CONF_ARGS[@]}" \
  --conf "spark.pyspark.python=$POETRY_PYTHON" \
  --conf "spark.pyspark.driver.python=$POETRY_PYTHON" \
  "$EXECUTOR_PY" \
  --tenant-id 1486434545505938432 \
  --topic-id 1486457832676011008 \
  --frequency daily \
  --process-date "$(date +%Y-%m-%d)"
