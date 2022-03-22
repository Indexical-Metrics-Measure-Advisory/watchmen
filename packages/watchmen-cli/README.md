# Watchmen CLI

## installation

```bash
pip install fire 
pip install requests
```

## basic usage

#### init configuration

- add site

```bash
python cli.py add_site source http://localhost:8080/ username password 
```

- search
    - space
    - user
    - user group
    - topic

```bash
python cli.py search topic source query_name
```

- list
    - pipeline

```bash
python cli.py list pipeline source 
```

- sync
    - space
        - name
    - topic
        - name
    - user
    - user group
    - pipeline
        - ids

```bash
python cli.py sync topic source target ["topic_name"]
python cli.py sync pipeline source target [111]
```

#### build executable app

```bash
pip install pyinstaller
pyinstaller cli.py
```

- run it in ``dist`` folder 
