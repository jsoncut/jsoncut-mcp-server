#!/bin/bash

# Publish Docker image to Docker Hub with auto-versioning from CHANGELOG
# Usage: ./publish-docker.sh [docker-username]
#
# Environment variables:
#   DOCKER_USERNAME - Docker Hub username (default: jsoncut)
#   DOCKER_PASSWORD - Docker Hub password/token (for CI/CD)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_USERNAME="${1:-${DOCKER_USERNAME:-centerbit}}"
IMAGE_NAME="jsoncut-mcp-server"
DOCKERFILE="Dockerfile"
CHANGELOG="CHANGELOG.md"

# Functions
log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if required files exist
if [ ! -f "$DOCKERFILE" ]; then
    log_error "Dockerfile not found!"
    exit 1
fi

if [ ! -f "$CHANGELOG" ]; then
    log_error "CHANGELOG.md not found!"
    exit 1
fi

# Extract version from CHANGELOG.md
# Looking for pattern: ## [X.Y.Z] - YYYY-MM-DD
VERSION=$(grep -m 1 -oP '(?<=## \[)[0-9]+\.[0-9]+\.[0-9]+(?=\])' "$CHANGELOG")

if [ -z "$VERSION" ]; then
    log_error "Could not extract version from CHANGELOG.md"
    log_info "Expected format: ## [X.Y.Z] - YYYY-MM-DD"
    exit 1
fi

log_info "Detected version: $VERSION"

# Build image tags
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"
VERSION_TAG="${FULL_IMAGE_NAME}:${VERSION}"
LATEST_TAG="${FULL_IMAGE_NAME}:latest"

# Parse version for additional tags
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f2)
MAJOR_MINOR_TAG="${FULL_IMAGE_NAME}:${MAJOR}.${MINOR}"
MAJOR_TAG="${FULL_IMAGE_NAME}:${MAJOR}"

log_info "Building Docker image..."
log_info "Tags: $VERSION, $MAJOR.$MINOR, $MAJOR, latest"

# Build the image
docker build -t "$VERSION_TAG" -t "$LATEST_TAG" -t "$MAJOR_MINOR_TAG" -t "$MAJOR_TAG" -f "$DOCKERFILE" .

if [ $? -ne 0 ]; then
    log_error "Docker build failed!"
    exit 1
fi

log_success "Docker image built successfully"

# Check if we're logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    log_warning "Not logged in to Docker Hub"
    
    if [ -n "$DOCKER_PASSWORD" ]; then
        log_info "Logging in with provided credentials..."
        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
    else
        log_info "Please log in to Docker Hub:"
        docker login -u "$DOCKER_USERNAME"
    fi
fi

# Confirm before pushing
echo ""
log_warning "Ready to push the following tags:"
echo "  - $VERSION_TAG"
echo "  - $MAJOR_MINOR_TAG"
echo "  - $MAJOR_TAG"
echo "  - $LATEST_TAG"
echo ""

if [ -z "$CI" ]; then
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Publish cancelled"
        exit 0
    fi
fi

# Push all tags
log_info "Pushing images to Docker Hub..."

docker push "$VERSION_TAG"
docker push "$MAJOR_MINOR_TAG"
docker push "$MAJOR_TAG"
docker push "$LATEST_TAG"

if [ $? -ne 0 ]; then
    log_error "Docker push failed!"
    exit 1
fi

log_success "Successfully published Docker images!"
echo ""
log_info "Images published:"
echo "  - $VERSION_TAG"
echo "  - $MAJOR_MINOR_TAG"
echo "  - $MAJOR_TAG"
echo "  - $LATEST_TAG"
echo ""
log_info "You can now pull the image with:"
echo "  docker pull $VERSION_TAG"
echo "  docker pull $LATEST_TAG"
