# Node Logger Docker Commands

.PHONY: help build up script down logs clean restart test stats

# Default target
help:
	@echo "Node Logger Docker Commands:"
	@echo "  script    - Start with docker-up.sh script (recommended)"
	@echo "  build     - Build Docker image"
	@echo "  up        - Start services with Docker Compose"
	@echo "  down      - Stop services"
	@echo "  logs      - View logs"
	@echo "  restart   - Restart services"
	@echo "  test      - Run API tests"
	@echo "  clean     - Clean up containers and images"
	@echo "  status    - Show container status"
	@echo "  stats     - Show resource usage statistics"

# Build Docker image
build:
	docker compose build

# Start services
up:
	docker compose up -d
	@echo "✅ Server started at http://localhost:4005"
	@echo "📊 Resource Limits: 0.5 CPU, 1GB RAM"

# Start with docker script (recommended)
script:
	./docker-up.sh
	@echo "🚀 Started with docker-up.sh script"

# Stop services
down:
	docker compose down

# View logs
logs:
	docker compose logs -f

# Restart services
restart: down up

# Run tests (requires server to be running)
test:
	npm test

# Clean up
clean:
	docker compose down -v --rmi all --remove-orphans
	docker system prune -f

# Show status
status:
	docker compose ps

# Show resource usage
stats:
	@echo "📊 Container Resource Usage:"
	@docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}" || echo "No containers running"

# Quick development setup
dev: build up logs
