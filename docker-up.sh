#!/bin/bash

# Node Logger Docker Run Script
# Runs the container with resource limits: 0.5 CPU, 1GB RAM

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTAINER_NAME="node-logger-app"
IMAGE_NAME="node-logger"
PORT=4005
LOGS_DIR="./logs"

# Resource limits
CPU_LIMIT="0.5"
MEMORY_LIMIT="1g"
MEMORY_RESERVATION="128m"

echo -e "${BLUE}🐳 Node Logger Docker Setup${NC}"
echo -e "${BLUE}================================${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Function to stop and remove existing container
cleanup_existing() {
    if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
        echo -e "${YELLOW}🛑 Stopping existing container: ${CONTAINER_NAME}${NC}"
        docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
        echo -e "${YELLOW}🗑️  Removing existing container: ${CONTAINER_NAME}${NC}"
        docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
    fi
}

# Function to build image if it doesn't exist
build_image() {
    if ! docker images --format '{{.Repository}}' | grep -Eq "^${IMAGE_NAME}\$"; then
        echo -e "${BLUE}🔨 Building Docker image: ${IMAGE_NAME}${NC}"
        docker build -t "${IMAGE_NAME}" .
    else
        echo -e "${GREEN}✅ Docker image already exists: ${IMAGE_NAME}${NC}"
    fi
}

# Function to create logs directory
create_logs_dir() {
    if [ ! -d "${LOGS_DIR}" ]; then
        echo -e "${BLUE}📁 Creating logs directory: ${LOGS_DIR}${NC}"
        mkdir -p "${LOGS_DIR}"
    fi
}

# Function to run container
run_container() {
    echo -e "${BLUE}🚀 Starting container with resource limits:${NC}"
    echo -e "${BLUE}   📊 CPU Limit: ${CPU_LIMIT}${NC}"
    echo -e "${BLUE}   🧠 Memory Limit: ${MEMORY_LIMIT}${NC}"
    echo -e "${BLUE}   🔒 Memory Reservation: ${MEMORY_RESERVATION}${NC}"
    
    docker run -d \
        --name "${CONTAINER_NAME}" \
        --cpus="${CPU_LIMIT}" \
        --memory="${MEMORY_LIMIT}" \
        --memory-reservation="${MEMORY_RESERVATION}" \
        -p "${PORT}:${PORT}" \
        -v "$(pwd)/logs:/app/logs" \
        -e NODE_ENV=production \
        -e PORT="${PORT}" \
        --restart unless-stopped \
        --health-cmd="curl -f http://localhost:${PORT}/ || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        --health-start-period=40s \
        "${IMAGE_NAME}"
    
    echo -e "${GREEN}✅ Container started successfully!${NC}"
    echo -e "${GREEN}📡 Server running at: http://localhost:${PORT}${NC}"
}

# Function to show container status
show_status() {
    echo -e "\n${BLUE}📊 Container Status:${NC}"
    docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo -e "\n${BLUE}📈 Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" "${CONTAINER_NAME}" 2>/dev/null || echo "Resource stats not available yet"
}

# Function to show logs
show_logs() {
    echo -e "\n${BLUE}📋 Recent logs (last 10 lines):${NC}"
    docker logs --tail 10 "${CONTAINER_NAME}" 2>/dev/null || echo "No logs available yet"
}

# Main execution
main() {
    cleanup_existing
    create_logs_dir
    build_image
    run_container
    
    # Wait a moment for container to start
    sleep 3
    
    show_status
    show_logs
    
    echo -e "\n${GREEN}🎉 Setup completed!${NC}"
    echo -e "${YELLOW}💡 Useful commands:${NC}"
    echo -e "   🔍 View logs: ${BLUE}docker logs -f ${CONTAINER_NAME}${NC}"
    echo -e "   📊 Check stats: ${BLUE}docker stats ${CONTAINER_NAME}${NC}"
    echo -e "   🛑 Stop container: ${BLUE}docker stop ${CONTAINER_NAME}${NC}"
    echo -e "   🗑️  Remove container: ${BLUE}docker rm ${CONTAINER_NAME}${NC}"
    echo -e "   🔄 Restart: ${BLUE}./docker-up.sh${NC}"
}

# Handle script arguments
case "${1:-}" in
    "stop")
        echo -e "${YELLOW}🛑 Stopping container: ${CONTAINER_NAME}${NC}"
        docker stop "${CONTAINER_NAME}"
        ;;
    "remove"|"rm")
        echo -e "${YELLOW}🗑️  Stopping and removing container: ${CONTAINER_NAME}${NC}"
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        ;;
    "logs")
        echo -e "${BLUE}📋 Container logs:${NC}"
        docker logs -f "${CONTAINER_NAME}"
        ;;
    "stats")
        echo -e "${BLUE}📊 Container stats:${NC}"
        docker stats "${CONTAINER_NAME}"
        ;;
    "status")
        show_status
        ;;
    "rebuild")
        echo -e "${BLUE}🔨 Rebuilding image...${NC}"
        docker stop "${CONTAINER_NAME}" 2>/dev/null || true
        docker rm "${CONTAINER_NAME}" 2>/dev/null || true
        docker rmi "${IMAGE_NAME}" 2>/dev/null || true
        main
        ;;
    "help"|"-h"|"--help")
        echo -e "${BLUE}Node Logger Docker Script${NC}"
        echo -e "${BLUE}Usage: ./docker-up.sh [command]${NC}"
        echo ""
        echo -e "${YELLOW}Commands:${NC}"
        echo -e "  ${GREEN}(no args)${NC}  - Start the container"
        echo -e "  ${GREEN}stop${NC}       - Stop the container"
        echo -e "  ${GREEN}remove${NC}     - Stop and remove the container"
        echo -e "  ${GREEN}logs${NC}       - View container logs (follow mode)"
        echo -e "  ${GREEN}stats${NC}      - View container resource stats"
        echo -e "  ${GREEN}status${NC}     - Show container status"
        echo -e "  ${GREEN}rebuild${NC}    - Rebuild image and restart container"
        echo -e "  ${GREEN}help${NC}       - Show this help message"
        ;;
    "")
        main
        ;;
    *)
        echo -e "${RED}❌ Unknown command: ${1}${NC}"
        echo -e "${YELLOW}💡 Use './docker-up.sh help' for available commands${NC}"
        exit 1
        ;;
esac
