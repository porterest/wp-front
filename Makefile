HEAD_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)

deploy:
	# stage 1: stop compose
	@echo "Stopping running containers..."
	docker compose stop

	# stage 2: update the codebase
	@if [ -n "$(b)" ]; then \
		echo "Pulling branch $(b)..."; \
		git pull origin $(b); \
	else \
		echo "Pulling current branch $(HEAD_BRANCH)..."; \
		git pull origin $(HEAD_BRANCH); \
	fi

	# stage 3: build and run
	@echo "Rebuilding and starting containers..."
	docker compose up --build -d
	@echo "Deployment complete."