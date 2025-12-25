#!/bin/bash
# set -e

echo "Starting Watchmen MySQL Database Initialization..."

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
    dirs=$(find . -maxdepth 1 -mindepth 1 -type d | sort -V)
    
    for d in $dirs; do
        echo "Processing version directory: $d"
        # Find sql files in this version directory, sort them alphabetically
        files=$(find "$d" -maxdepth 1 -name "*.sql" | sort)
        
        for f in $files; do
            echo "Executing $f..."
            # Use root user and password for initialization to ensure permissions
            mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < "$f"
        done
    done
    
    cd - > /dev/null
}

echo "Running Meta Scripts..."
run_sql_in_dir "/docker-entrypoint-initdb.d/init-scripts/meta-scripts"

echo "Running Data Scripts..."
run_sql_in_dir "/docker-entrypoint-initdb.d/init-scripts/data-scripts"

echo "Watchmen MySQL Database Initialization Completed."
