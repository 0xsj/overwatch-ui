# Reads the ambient environment the root Makefile exports. Never ../.env —
# decisions/0001-three-repositories-one-root-env.
PORT ?= $(PORT_WEB)
PORT := $(or $(PORT),7010)

.DEFAULT_GOAL := help
.PHONY: help dev build test check

help:  ## Show targets
	@grep -hE '^[a-z-]+:.*##' $(MAKEFILE_LIST) | sed 's/:.*##/\t/' | column -t -s"$$(printf '\t')"

dev:   ## the client dev server
	@npx next dev --port $(PORT)

build: ## a production build
	@npx next build

test:  ## the tests. None yet, and saying so beats exiting 0 silently
	@echo "overwatch-ui has no tests yet."

check: ## types and lint
	@npx tsc --noEmit
	@npx next lint
