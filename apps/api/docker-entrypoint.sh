#!/bin/sh
set -e

# Parse host and port from DATABASE_URL if DB_HOST is not set
if [ -z "$DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
  # Extract host and port from e.g. postgresql://user:pass@host:5432/dbname
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
fi

DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}

echo "=============================================="
echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
echo "=============================================="

MAX_RETRIES=30
RETRY_COUNT=0

until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null || node -e "
  const net = require('net');
  const client = net.connect({ host: '$DB_HOST', port: parseInt('$DB_PORT') }, () => {
    client.end();
    process.exit(0);
  });
  client.on('error', () => process.exit(1));
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Timed out waiting for PostgreSQL after $MAX_RETRIES attempts."
    exit 1
  fi
  echo "PostgreSQL is not ready yet... retry $RETRY_COUNT/$MAX_RETRIES"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

if [ "$SEED_DATABASE" = "true" ] || [ "$AUTO_SEED" = "true" ]; then
  echo "🌱 Executing database seed script..."
  npm run prisma:seed || echo "⚠️ Seed skipped or encountered non-fatal notice"
fi

echo "🚀 Starting B-MOST REST API..."
exec "$@"
