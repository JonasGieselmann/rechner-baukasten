# Rechner-Baukasten Roadmap

## Status: ✅ Phases 1-4 Complete

---

## Phase 1: Review & Bugfixing
> Gründliches Review aller bestehenden Komponenten

### TypeScript & Build
- [x] TypeScript Check durchführen (`npx tsc --noEmit`) ✅
- [x] ESLint Errors beheben (5 Fehler gefixed) ✅
- [x] CSS @import Warning beheben (Google Fonts in HTML) ✅
- [ ] Console Errors im Browser prüfen

### Block-Renderer
- [x] TextBlockRenderer überprüfen ✅
- [x] InputBlockRenderer überprüfen ✅
- [x] SliderBlockRenderer überprüfen ✅
- [x] ResultBlockRenderer überprüfen ✅
- [x] ChartBlockRenderer überprüfen ✅
- [x] ComparisonBlockRenderer überprüfen ✅

### Drag & Drop
- [ ] Sidebar → Canvas Drag testen
- [ ] Zwischen Blöcken einfügen testen
- [ ] Drop-Zones visuelles Feedback prüfen
- [ ] Sortieren von Blöcken testen

### Navigation & Routing
- [ ] Home → Editor Navigation testen
- [ ] Zurück-Button funktioniert
- [ ] Deep-Links zu /editor/:id funktionieren
- [ ] 404-Redirect auf Home

### Persistenz
- [ ] Autosave (30 Sek. Intervall) testen
- [ ] Save on beforeunload testen
- [ ] LocalStorage Persistenz prüfen
- [ ] Calculator laden nach Refresh

### Import/Export
- [ ] JSON Export funktioniert
- [ ] JSON Import funktioniert
- [ ] Excel/CSV Import testen
- [ ] Spalten-Info im Import-Modal

### Editor Features
- [ ] Properties Panel für alle Block-Typen
- [ ] Formel-Engine mit Variablen-Substitution
- [ ] Preview-Modus Toggle
- [ ] Embed-Code Export

### UI/UX
- [ ] Responsive Design (Mobile + Desktop)
- [ ] Dark Theme konsistent
- [ ] Animationen flüssig

---

## Phase 2: Authentication ✅
> Vollständiges Authentifizierungssystem

### Recherche (vor Implementierung)
- [x] Lucia Auth evaluieren → Deprecated seit März 2025 ✅
- [x] Better Auth evaluieren → Gewählt als Nachfolger ✅
- [x] Entscheidung dokumentieren ✅

### Implementierung
- [x] Better Auth installieren & konfigurieren ✅
- [x] Express.js Backend mit Better Auth Handler ✅
- [x] SQLite Database mit Drizzle ORM ✅
- [x] User Registration (Email + Passwort) ✅
- [x] Login / Logout ✅
- [x] Session Management ✅
- [x] Protected Routes (Editor nur für eingeloggte User) ✅
- [x] Auth Schema automatisch initialisiert ✅

### UI Komponenten
- [x] Login Page ✅
- [x] Register Page ✅
- [x] User Menu / Avatar im Header ✅
- [ ] Forgot Password Page (optional für MVP)

---

## Phase 3: Custom Rechner Hosting ✅
> BeautyFlow-Rechner als Custom Calculator hosten (nicht als Block extrahieren)

### Konzept
- [x] Custom-Rechner Typ definiert (fertige Apps vs. Builder-Rechner) ✅
- [x] Option A: Statische Bundles gewählt (einfachste Lösung) ✅

### Implementierung
- [x] Ordnerstruktur: `/public/custom-calculators/` ✅
- [x] BeautyFlow Build mit relativen Pfaden ✅
- [x] `registry.json` für Custom-Rechner Metadaten ✅
- [x] `config.json` pro Custom-Rechner ✅

### Dashboard Integration
- [x] Home Page: Tabs "Builder-Rechner" / "Custom-Rechner" ✅
- [x] Custom-Rechner Karten mit Status, Vorschau, Embed-Code ✅
- [x] Embed-Code Modal für beide Typen ✅

### Routing
- [x] `/embed/:id` für Builder-Rechner ✅
- [x] `/embed/custom/:slug` für Custom-Rechner ✅
- [x] `CustomEmbed.tsx` Page komponente ✅
- [x] `BuilderEmbed.tsx` Page Komponente ✅

---

## Phase 4: Docker & Deployment ✅
> Produktionsbereit für Dokploy/Docker

### Docker Setup
- [x] Dockerfile erstellen (Multi-Stage Build) ✅
- [x] docker-compose.yml für lokales Testing ✅
- [x] Environment Variables (.env, .env.example) ✅
- [x] Health Check Endpoint (/api/health) ✅
- [x] .dockerignore erstellt ✅
- [x] tsconfig.server.json für Server Build ✅

### Embed-Funktionalität
- [x] /embed/:id Route für Builder-Rechner ✅
- [x] /embed/custom/:slug für Custom-Rechner ✅
- [x] iframe-kompatibles Rendering ✅
- [x] CORS-Konfiguration (Express) ✅
- [x] Embed-Code-Generator in Home & Toolbar ✅

### Server Production Mode
- [x] Static file serving für Frontend Build ✅
- [x] SPA fallback für React Router ✅
- [x] Custom-Calculators static serving ✅

---

## Phase 5: Database & Backend
> Falls Auth Backend benötigt

### Recherche
- [ ] SQLite vs PostgreSQL evaluieren
- [ ] Drizzle ORM vs Prisma evaluieren
- [ ] Entscheidung dokumentieren

### Implementierung
- [ ] Datenbank Schema erstellen
- [ ] API Endpoints (REST oder tRPC)
- [ ] User-Tabelle
- [ ] Calculators-Tabelle
- [ ] Migrations Setup

---

## Entscheidungen

| Datum | Thema | Entscheidung | Begründung |
|-------|-------|--------------|------------|
| 2025-01-26 | Auth | **Better Auth** | Lucia ist seit März 2025 deprecated. Better Auth ist der empfohlene Nachfolger mit TypeScript-first Ansatz, built-in Email/Password, und einfacher Integration. |
| 2025-01-26 | Database | **SQLite** | File-based, einfach für Self-Hosted, kein separater DB-Server nötig. Kann später auf PostgreSQL migriert werden. |
| 2025-01-26 | Backend | **Express.js** | Leichtgewichtig, bewährt, gute Better Auth Integration via `toNodeHandler`. |
| 2025-01-26 | ORM | **Drizzle ORM** | Leichtgewichtig, SQL-nah, TypeScript-first, gute SQLite-Unterstützung. |

---

## Quellen & Dokumentation

### Projekt-Abhängigkeiten
- React 19: https://react.dev
- Zustand: https://docs.pmnd.rs/zustand
- @dnd-kit: https://docs.dndkit.com
- Recharts: https://recharts.org
- Tailwind CSS v4: https://tailwindcss.com/docs

### Auth Optionen
- Lucia Auth: https://lucia-auth.com
- Better Auth: https://www.better-auth.com
- Supabase Auth: https://supabase.com/docs/guides/auth
- Auth.js: https://authjs.dev
- Logto: https://logto.io

### Docker & Deployment
- Dockerfile Reference: https://docs.docker.com/reference/dockerfile/
- Vite Docker: https://vitejs.dev/guide/static-deploy.html#docker
- Dokploy: https://docs.dokploy.com

### Inspiration
- Tally.so: Form-Builder UX
- Typeform: Embed-Code Generator
- Notion: Block-Editor UX
- Calconic: Calculator Builder

---

## Changelog

### 2026-01-26
- Initial Roadmap erstellt
- Phase 1 Review gestartet
- CLAUDE.md Projekt-Kontext erstellt
- TypeScript Check: 0 Errors ✅
- ESLint: 5 Errors gefixed (unused vars, case blocks, const) ✅
- Alle 6 Block-Renderer reviewt und verifiziert ✅
- CSS @import: Google Fonts bereits korrekt in HTML ✅

**Phase 2: Authentication abgeschlossen:**
- Better Auth als Auth-Lösung gewählt (Lucia deprecated)
- Express.js Backend mit SQLite/Drizzle ORM
- Login/Register Pages erstellt
- AuthProvider & ProtectedRoute Komponenten
- User Menu in Toolbar integriert
- DB Schema automatisch initialisiert

**Phase 3: Custom Rechner Hosting abgeschlossen:**
- BeautyFlow-Rechner als erster Custom-Rechner integriert
- Home Page mit Tabs (Builder/Custom)
- Embed-Routen für beide Typen
- Registry-System für Custom-Rechner

**Phase 4: Docker Setup abgeschlossen:**
- Multi-Stage Dockerfile erstellt
- docker-compose.yml für lokales Testing
- Production mode mit static file serving
- Health Check Endpoint

**Weitere Verbesserungen:**
- Import Modal mit detaillierter Benutzeranleitung
- Variable-Vorschau im Import Modal
- Embed-Code Modals in Home Dashboard
