#!/bin/bash
set -e

echo "Starting Watchmen Database Initialization..."

# Function to run sql files in a directory
run_sql_in_dir() {
    local base_dir="$1"
    if [ ! -d "$base_dir" ]; then
        echo "Directory $base_dir does not exist, skipping."
        return
    fi

    echo "Entering directory: $base_dir"
    cd "$base_dir"
    
    # List directories, sort them by version
    # sort -V is available in Debian-based images (official postgres image is Debian-based)
    dirs=$(find . -maxdepth 1 -mindepth 1 -type d | sort -V)
    
    for d in $dirs; do
        echo "Processing version directory: $d"
        # Find sql files in this version directory, sort them alphabetically
        files=$(find "$d" -maxdepth 1 -name "*.sql" | sort)
        
        for f in $files; do
            echo "Executing $f..."
            psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
        done
    done
    
    cd - > /dev/null
}

echo "Running Meta Scripts..."
run_sql_in_dir "/docker-entrypoint-initdb.d/init-scripts/meta-scripts"

echo "Running Data Scripts..."
run_sql_in_dir "/docker-entrypoint-initdb.d/init-scripts/data-scripts"

echo "Watchmen Database Initialization Completed."
