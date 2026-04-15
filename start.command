#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Starting PDL server at http://localhost:8080"
open http://localhost:8080
node server.js
