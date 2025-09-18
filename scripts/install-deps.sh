#!/bin/bash

# Explicitly unset any production-related npm configs to avoid deprecated warnings
unset NPM_CONFIG_PRODUCTION
export NPM_CONFIG_FUND=false
export NPM_CONFIG_AUDIT=false

# Use modern npm install approach
npm ci --omit=dev --no-audit --no-fund
