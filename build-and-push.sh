#!/bin/bash

# Check if REPO var is set
if [ -z "$REPO" ]; then
  echo "Env var REPO is not set. Please set it."
  exit 1
fi

# Set tag
TAG=${TAG:-latest}

# Image names
BACKEND_IMAGE="$REPO/tenis-backend:$TAG"
FRONTEND_IMAGE="$REPO/tenis-frontend:$TAG"
MONGODB_IMAGE="$REPO/tenis-mongodb:$TAG"

# Build and tag
echo "Build and tag backend..."
docker buildx build -t $BACKEND_IMAGE -f Dockerfile-backend .

echo "Build and tag frontend..."
docker buildx build -t $FRONTEND_IMAGE -f Dockerfile-frontend .

echo "Build and tag mongodb..."
docker buildx build -t $MONGODB_IMAGE -f Dockerfile-mongodb .

echo "Pushing images to $REPO..."

echo "=== Pushing $BACKEND_IMAGE"
docker push $BACKEND_IMAGE
echo "=== Pushing $FRONTEND_IMAGE"
docker push $FRONTEND_IMAGE
echo "=== Pushing $MONGODB_IMAGE"
docker push $MONGODB_IMAGE

echo "All the images are built and pushed to $REPO!"
