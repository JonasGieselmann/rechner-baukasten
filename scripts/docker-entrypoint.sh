#!/bin/sh
set -e

# ============================================
# Kalku Docker Entrypoint
# - Setzt APP_URL/BETTER_AUTH_URL aus DOMAIN
# - Erstellt automatisch Traefik Config
# ============================================

# URLs aus DOMAIN ableiten (falls nicht explizit gesetzt)
if [ -n "$DOMAIN" ]; then
    export APP_URL="${APP_URL:-https://$DOMAIN}"
    export BETTER_AUTH_URL="${BETTER_AUTH_URL:-https://$DOMAIN}"
    echo "📍 DOMAIN: $DOMAIN"
    echo "🔗 APP_URL: $APP_URL"
    echo "🔐 BETTER_AUTH_URL: $BETTER_AUTH_URL"
fi

TRAEFIK_CONFIG_DIR="/traefik-dynamic"
TRAEFIK_CONFIG_FILE="$TRAEFIK_CONFIG_DIR/kalku.yml"

# Prüfen ob Traefik Config erstellt werden soll
if [ -d "$TRAEFIK_CONFIG_DIR" ] && [ -n "$DOMAIN" ]; then
    echo "🔧 Creating Traefik config for domain: $DOMAIN"

    # Service-Name aus Hostname oder ENV
    SERVICE_NAME="${SERVICE_NAME:-kalku}"

    # Traefik Dynamic Config erstellen
    cat > "$TRAEFIK_CONFIG_FILE" << EOF
http:
  routers:
    kalku:
      rule: "Host(\`$DOMAIN\`)"
      entryPoints:
        - websecure
      service: kalku
      tls:
        certResolver: letsencrypt

  services:
    kalku:
      loadBalancer:
        servers:
          - url: "http://${SERVICE_NAME}:3001"
EOF

    echo "✅ Traefik config created at $TRAEFIK_CONFIG_FILE"
    cat "$TRAEFIK_CONFIG_FILE"
    echo ""
else
    if [ ! -d "$TRAEFIK_CONFIG_DIR" ]; then
        echo "ℹ️  Traefik config dir not mounted, skipping config creation"
    fi
    if [ -z "$DOMAIN" ]; then
        echo "ℹ️  DOMAIN not set, skipping Traefik config creation"
    fi
fi

# Server starten
echo "🚀 Starting Kalku server..."
exec node dist/server/index.js
