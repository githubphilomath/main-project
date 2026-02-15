#!/bin/sh
set -e
echo "Running database initialization..."
python -m scripts.init_db || true
echo "Starting API..."
exec "$@"
