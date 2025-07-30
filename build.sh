#!/usr/bin/env bash

# Exit on error
set -o errexit

# Install dependencies
npm ci

# Build the application
npm run build
