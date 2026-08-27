POETRY ?= poetry

.PHONY: install smoke test keep down help

install: ## create/update the harness virtualenv (includes dev deps)
	$(POETRY) install

smoke: ## fast core-path run against mysql (~5 min)
	$(POETRY) run wht run --suite smoke

test: ## full scenarios + newman against mysql
	$(POETRY) run wht run

keep: ## full run, but leave the docker stack up afterwards for debugging
	$(POETRY) run wht run --keep

down: ## tear down a kept stack
	docker compose -f docker/docker-compose.yml -p wht down -v

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-8s %s\n", $$1, $$2}'
