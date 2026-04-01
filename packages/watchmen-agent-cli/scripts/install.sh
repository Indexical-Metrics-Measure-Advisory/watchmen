#!/bin/bash

# Get the absolute path to the directory where this script is located
INSTALL_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BINARY_NAME="agent-cli"
DEST_DIR="/usr/local/bin"

# Check if the binary exists in the current directory
if [ ! -f "$INSTALL_DIR/$BINARY_NAME" ]; then
    echo "Error: $BINARY_NAME not found in $INSTALL_DIR."
    exit 1
fi

# Ensure the binary is executable
chmod +x "$INSTALL_DIR/$BINARY_NAME"

# Check if the destination directory exists and is in PATH
if [[ ":$PATH:" != *":$DEST_DIR:"* ]]; then
    echo "Warning: $DEST_DIR is not in your PATH. You may need to add it to your shell configuration."
fi

# Create a symbolic link in /usr/local/bin
echo "Installing $BINARY_NAME to $DEST_DIR..."
# Try to create link without sudo first, then with sudo if it fails
if ln -sf "$INSTALL_DIR/$BINARY_NAME" "$DEST_DIR/$BINARY_NAME" 2>/dev/null; then
    echo "Installation successful! You can now run '$BINARY_NAME' from any directory."
else
    echo "Requesting administrative privileges to create symbolic link in $DEST_DIR..."
    if sudo ln -sf "$INSTALL_DIR/$BINARY_NAME" "$DEST_DIR/$BINARY_NAME"; then
        echo "Installation successful! You can now run '$BINARY_NAME' from any directory."
    else
        echo "Installation failed. Please check your permissions."
        exit 1
    fi
fi
