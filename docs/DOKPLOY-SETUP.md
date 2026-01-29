# Kalku Deployment auf Dokploy

## Warum manuelle Traefik-Config?

Dokploy's Domain-Feature funktioniert bei Docker Swarm + Compose nicht zuverlässig, weil:
- Labels aus `docker-compose.yml` werden nicht auf Swarm Services angewendet
- Volume-Mounts werden ignoriert
- Das Domain-Feature setzt intern auf Labels, die bei Swarm nicht greifen

**Lösung:** Einmalige manuelle Traefik Dynamic Config erstellen.

---

## Voraussetzungen

### ENV-Variablen in Dokploy

```env
DOMAIN=kalku.layer-one.io
SERVICE_NAME=kalku-kalku-kyaelg
DATABASE_URL=postgresql://user:pass@host:5432/db
BETTER_AUTH_SECRET=dein-secret-key
```

> [!info] APP_URL & BETTER_AUTH_URL
> Diese werden automatisch vom Entrypoint aus `DOMAIN` abgeleitet.
> Du kannst sie auch manuell setzen, wenn gewünscht.

### SERVICE_NAME finden

```bash
docker service ls | grep kalku
```

Der Name ist z.B. `kalku-kalku-kyaelg` - diesen Wert in Dokploy ENV eintragen.

---

## Traefik Setup (einmalig pro Domain)

### Script ausführen

```bash
sudo tee /etc/dokploy/traefik/dynamic/kalku.yml << 'EOF'
http:
  routers:
    kalku:
      rule: "Host(`kalku.layer-one.io`)"
      entryPoints:
        - websecure
      service: kalku
      tls:
        certResolver: letsencrypt

  services:
    kalku:
      loadBalancer:
        servers:
          - url: "http://kalku-kalku-kyaelg:3001"
EOF
```

### Was macht das Script?

| Zeile | Erklärung |
|-------|-----------|
| `sudo tee ...` | Schreibt mit Root-Rechten in Traefik's Config-Verzeichnis |
| `routers.kalku` | Definiert einen Router namens "kalku" |
| `rule: "Host(...)"` | Matcht Requests an diese Domain |
| `entryPoints: websecure` | Nutzt HTTPS (Port 443) |
| `tls.certResolver` | Let's Encrypt für automatische SSL-Zertifikate |
| `services.kalku` | Definiert wohin Traffic geroutet wird |
| `url: "http://..."` | Interne Docker Swarm Service-URL |

> [!important] Service-Name im URL
> Der Service-Name im `url` muss exakt dem Docker Swarm Service entsprechen!
> Format: `http://{SERVICE_NAME}:{PORT}`

---

## Verifizierung

### 1. Config prüfen

```bash
cat /etc/dokploy/traefik/dynamic/kalku.yml
```

### 2. Service Status

```bash
docker service ls | grep kalku
docker service logs kalku-kalku-kyaelg --tail 50
```

### 3. Health Check

```bash
curl -s https://kalku.layer-one.io/api/health
# Erwartete Ausgabe: {"status":"ok"}
```

---

## Für neue Domains/Instanzen

Bei einer neuen Kalku-Instanz auf einem anderen Server:

1. **Dokploy Service erstellen** mit den ENV-Variablen
2. **SERVICE_NAME ermitteln:** `docker service ls | grep kalku`
3. **Traefik-Config erstellen** (Script oben anpassen):
   - Domain ändern: `Host(\`neue-domain.de\`)`
   - Service-URL ändern: `http://neuer-service-name:3001`

---

## Troubleshooting

### 404 Page Not Found

```bash
# Traefik-Config existiert?
ls -la /etc/dokploy/traefik/dynamic/

# Service läuft?
docker service ps kalku-kalku-kyaelg --no-trunc

# Traefik Logs
docker service logs dokploy-traefik --tail 100
```

### Container startet nicht

```bash
# Logs prüfen
docker service logs kalku-kalku-kyaelg --tail 100

# Häufige Ursache: ENV-Variablen fehlen
docker service inspect kalku-kalku-kyaelg --pretty | grep -A 20 "Env:"
```

### SSL-Zertifikat Fehler

```bash
# Traefik ACME Logs
docker service logs dokploy-traefik 2>&1 | grep -i acme
```

---

## Architektur

```
┌─────────────────────────────────────────────────────────┐
│                      Internet                           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 Traefik (Reverse Proxy)                 │
│  - Liest /etc/dokploy/traefik/dynamic/*.yml             │
│  - SSL Termination (Let's Encrypt)                      │
│  - Routing basierend auf Host-Header                    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              Docker Swarm Network                       │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │ kalku-kalku-... │    │ kalku-db-...    │             │
│  │ (Node.js:3001)  │───▶│ (PostgreSQL)    │             │
│  └─────────────────┘    └─────────────────┘             │
└─────────────────────────────────────────────────────────┘
```

---

## Dateien im Repo

| Datei | Zweck |
|-------|-------|
| `docker-compose.yml` | Dokploy Deployment Config |
| `Dockerfile` | Multi-stage Build |
| `scripts/docker-entrypoint.sh` | ENV-Ableitung + Server-Start |
| `scripts/setup-traefik.sh` | Alternatives Setup-Script |
| `traefik/kalku.yml` | Beispiel Traefik-Config |
