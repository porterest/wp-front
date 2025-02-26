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


pb:
	git add backend/
	git commit -m "meow (backend)"
	@if [ -n "$(b)" ]; then \
		echo "Pushing to branch $(b)..."; \
		git push origin $(b); \
	else \
		echo "Pushing to HEAD $(HEAD_BRANCH)..."; \
		git push origin $(HEAD_BRANCH); \
	fi

pf:
	git add frontend/
	git commit -m "meow (frontend)"
	@if [ -n "$(b)" ]; then \
		echo "Pushing to branch $(b)..."; \
		git push origin $(b); \
	else \
		echo "Pushing to HEAD $(HEAD_BRANCH)..."; \
		git push origin $(HEAD_BRANCH); \
	fi

p:
	git add ./
	git commit -m "meow (all)"
	@if [ -n "$(b)" ]; then \
		echo "Pushing to branch $(b)..."; \
		git push origin $(b); \
	else \
		echo "Pushing to HEAD $(HEAD_BRANCH)..."; \
		git push origin $(HEAD_BRANCH); \
	fi

pv:
	git add backend/vault
	git commit -m "fix: vault"
	git push origin main

deploy-b:
	docker compose stop app
	@if [ -n "$(b)" ]; then \
		echo "Pulling branch $(b)..."; \
		git pull origin $(b); \
	else \
		echo "Pulling current branch $(HEAD_BRANCH)..."; \
		git pull origin $(HEAD_BRANCH); \
	fi
	docker compose up --build -d app

deploy-f:
	docker compose stop frontend
	@if [ -n "$(b)" ]; then \
		echo "Pulling branch $(b)..."; \
		git pull origin $(b); \
	else \
		echo "Pulling current branch $(HEAD_BRANCH)..."; \
		git pull origin $(HEAD_BRANCH); \
	fi
	docker compose up --build -d frontend

deploy-nginx:
	docker compose stop nginx
	@if [ -n "$(b)" ]; then \
		echo "Pulling branch $(b)..."; \
		git pull origin $(b); \
	else \
		echo "Pulling current branch $(HEAD_BRANCH)..."; \
		git pull origin $(HEAD_BRANCH); \
	fi
	docker compose up --build -d nginx

deploy-v:
	docker compose stop vault
	git pull origin main
	docker compose up --build -d vault