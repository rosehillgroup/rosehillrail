#!/bin/bash
set -e

echo "Building Rail site..."
echo "Google Maps API Key: ${GOOGLE_MAPS_API_KEY:0:10}..."

# Replace the placeholder with the actual API key
if [ -n "$GOOGLE_MAPS_API_KEY" ]; then
    sed -i "s/GOOGLE_MAPS_API_KEY/$GOOGLE_MAPS_API_KEY/g" contact.html
    echo "API key replacement completed"
else
    echo "WARNING: GOOGLE_MAPS_API_KEY environment variable not set"
fi

echo "Build completed successfully"