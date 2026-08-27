POETRY ?= poetry

.PHONY: install smoke test keep down help

install: ## create/update the virtualenv (includes the metricflow server deps)
	$(POETRY) install

smoke: ## health/auth + metric CRUD cycle against postgres (fast)
	$(POETRY) run mft run --suite smoke

test: ## full scenario suite
	$(POETRY) run mft run

keep: ## run, then leave postgres + server running for debugging
	$(POETRY) run mft run --keep

down: ## tear down a kept stack
	docker compose -f docker/docker-compose.yml -p mft down -v

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-8s %s\n", $$1, $$2}'
