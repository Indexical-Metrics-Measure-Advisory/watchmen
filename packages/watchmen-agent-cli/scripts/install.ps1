# This script adds the directory containing agent-cli.exe to your User PATH.
# Please run this script in an administrator PowerShell window if needed.

# Get the directory where the script is located
$InstallDir = $PSScriptRoot
$BinaryName = "agent-cli.exe"

# If binary is named agent-cli (without extension), look for it
if (-not (Test-Path "$InstallDir\$BinaryName")) {
    $BinaryName = "agent-cli"
}

# Check if binary exists
if (-not (Test-Path "$InstallDir\$BinaryName")) {
    Write-Host "Error: $BinaryName not found in $InstallDir. Please make sure the executable is in the same folder as this script." -ForegroundColor Red
    return
}

Write-Host "Installing agent-cli from $InstallDir..."

# Get current User PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if the directory is already in the User PATH
if ($UserPath -split ';' -contains $InstallDir) {
    Write-Host "$InstallDir is already in your PATH." -ForegroundColor Cyan
} else {
    Write-Host "Adding $InstallDir to User PATH..." -ForegroundColor Yellow
    
    # Add directory to PATH
    $NewPath = "$UserPath;$InstallDir"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    
    # Update current session PATH for immediate testing (though new terminal is still recommended)
    $env:Path = "$env:Path;$InstallDir"
    
    Write-Host "Successfully added to PATH!" -ForegroundColor Green
    Write-Host "NOTE: You may need to RESTART your terminal (or IDE) for the changes to take effect." -ForegroundColor Yellow
}

Write-Host "You can now run '$BinaryName' from any command prompt or PowerShell window." -ForegroundColor Green
