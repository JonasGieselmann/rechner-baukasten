#!/bin/bash
# Post-Deploy Script: Setzt Traefik Labels auf den Docker Swarm Service
# Verwendung: ./scripts/set-traefik-labels.sh [domain]
# Beispiel:   ./scripts/set-traefik-labels.sh kalku.layer-one.io

DOMAIN="${1:-kalku.layer-one.io}"

# Service finden (Pattern: kalku-kalku-*)
SERVICE_NAME=$(docker service ls --format '{{.Name}}' | grep 'kalku-kalku-' | head -1)

if [ -z "$SERVICE_NAME" ]; then
  echo "Error: Kein Kalku Service gefunden"
  exit 1
fi

echo "Setting Traefik labels for service: $SERVICE_NAME"
echo "Domain: $DOMAIN"

docker service update "$SERVICE_NAME" \
  --label-add "traefik.enable=true" \
  --label-add "traefik.http.routers.kalku.rule=Host(\`$DOMAIN\`)" \
  --label-add "traefik.http.routers.kalku.entrypoints=websecure" \
  --label-add "traefik.http.routers.kalku.tls.certresolver=letsencrypt" \
  --label-add "traefik.http.services.kalku.loadbalancer.server.port=3001"

echo "Done! Check: docker service inspect $SERVICE_NAME --format '{{json .Spec.Labels}}'"
