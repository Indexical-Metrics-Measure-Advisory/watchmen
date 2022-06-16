# Watchmen CLI

## installation

```bash
pip install poetry
poetry install --no-dev -vv
```

## basic usage

#### init configuration

- support env configuration

```yml
META_CLI_HOST=http://localhost
META_CLI_USERNAME=xxxxxx
META_CLI_PASSWORD=xxxxxx
META_CLI_PAT=xxxxxx
META_CLI_DEPLOY_FOLDER=/path/to/deploy/file
META_CLI_DEPLOY_PATTERN=replace
```

you should config META_CLI_USERNAME and META_CLI_PASSWORD, or config the META_CLI_PAT for authentication

- cli pattern

```bash
NAME
    cli.py

SYNOPSIS
    cli.py COMMAND

COMMANDS
    COMMAND is one of the following:
    
     deploy_asset
```

- deploy md asset

```bash
python cli.py deploy_asset
```
