# Kalku -> BeautyFlow Customer Portal - Vollstaendiges Agent-Handover (Ultra Plan)

## Auftrag an dich (neuer Agent)

Du uebernimmst Kalku (umgebaut zum BeautyFlow Customer Portal). Es gibt viel "erledigte" Arbeit - vertraue ihr nicht blind, pruefe aktiv nach (Verifikations-Block). Erst danach die offenen Punkte abarbeiten. Halte dich strikt an die Arbeitsweise.

---

## 1. Kontext & Infrastruktur

- Repo: github.com/JonasGieselmann/rechner-baukasten, Default-Branch `master` (User nennt es manchmal "main")
- Live: https://kalku.layer-one.io
- Lokaler Pfad: `.../Antigravity Working Space/Kalku`
- Deploy-Kette: Push `master` -> GitHub Action `docker-build.yml` -> Build -> GHCR -> Dokploy-Webhook `POST {DOKPLOY_WEBHOOK_URL}` (Webhook-Token `[redigiert - bitte rotieren; liegt als GH-Secret DOKPLOY_WEBHOOK_URL]`, als GH-Secret `DOKPLOY_WEBHOOK_URL`)
- Dokploy: laeuft im Docker Swarm; Webhook ist die zuverlaessige Deploy-Methode
- Placement-Constraints: `node.labels.apps==true`, `node.platform.arch==x86_64`
- WICHTIG (geloester Fallstrick): `buildServerId` der App zeigte auf eine unerreichbare Hetzner-VM `qeHgcXfNXe-poW-OeXEAE` -> Deploys schlugen in 2 Sek fehl, Prod hing auf altem Maerz-Build. Fix: `application.update` mit `buildServerId: null`. Falls Prod wieder "alte Version" zeigt -> das zuerst pruefen.
- DB: postgres-js; ein DNS-Fail auf Node `ubuntu` (`kalku-db-beivgf` nicht aufloesbar) trat mal auf - Constraint `node.hostname!=ubuntu` war Workaround, danach revertet.

## 2. Stack

- FE: React 19 + Vite 7 + TypeScript + Tailwind v4, Zustand (Funnel-Store), react-router-dom
- BE: Express 5 + Drizzle ORM + postgres-js + better-auth
- PDF: @react-pdf/renderer | Mail: nodemailer (SMTP)
- Crypto: AES-256-GCM, KEK via `scryptSync(BETTER_AUTH_SECRET, 'kalku-app-settings-v1', 32)`
- Tests: Vitest (Unit) + Playwright (Live-e2e, kein Mock)

## 3. Branding v2 (Single Source: branding/tokens.ts)

```ts
export const BRAND = {
  colors: {
    background: '#F7FAFF',  // Porzellan
    card: '#FFFFFF',
    text: '#0F2F5B',        // Navy
    primary: '#0F2F5B',
    accent: '#7EC8F3',      // Light Blue
    dark: '#04070D',
    border: '#E0E7F2',
    muted: '#5A7090',
  },
} as const;
```

Fonts: Inter + Instrument Serif (italic fuer `.brand-accent`). Wordmark: Beauty(Inter) + Flow(Instrument Serif italic). Durchgehend Sie-Anrede. Logo/Referenz: https://beauty-flow.de/

## 4. Arbeitsweise (stehende Anforderungen aus meinen Prompts)

- Sub-Agents fuer parallele Arbeit, Code-Review-Agent pro Chunk
- Code schlank & ohne Duplicates - Refactor-Pass ist Pflicht, kein zugemuellter Code
- Live-Tests mit Playwright + Screenshots, kein Mocking, echte Feedback-Loops
- Proper Umlaute (ae/oe/ue/ss als aeoeuess nur hier im ASCII-Handover; im Code echte ä/ö/ü/ß), keine ASCII-Transliterationen, keine Em-Dashes in Code/Copy
- Dateien < ~300 Zeilen, sonst splitten
- 100% production-ready mit Tests

---

## 5. Schluessel-Dateien (Ist-Zustand)

### Frontend
- `branding/tokens.ts` - Design-Tokens (oben)
- `src/components/Spinnennetz.tsx` - Custom SVG-Spider, Props `enableReveal`/`enableWiggle`/`pauseOnHover`; ersetzt Recharts in Intro + Result
- `src/components/Wordmark.tsx`, `Avatar.tsx` (war 4x dupliziert), `AdminHeader.tsx` (Nav: Rechner / Funnels / Kunden / Benutzer / Einstellungen)
- `src/components/AuthProvider.tsx` - `ExtendedUser` mit `role`, `approved`, `phone`, `businessName`, `websiteUrl`, `instagramHandle`, `gmbUrl`
- `src/pages/FunnelRunner.tsx` - `ResultSpiderStep` Apple-Redesign (Hero-Chart EUR Mehrumsatz -> Profil 8-Dim -> Empfehlung -> CTA), Lead-Prefill aus `useAuth`
- `src/pages/Register.tsx` - aufklappbare "Praxis-Angaben (optional)" mit Chevron
- `src/pages/customer/Account.tsx` - ProfileCard / PraxisCard / PasswordCard / DeleteAccountCard
- `src/pages/customer/DashboardLayout.tsx` - Desktop-Sidebar (md+) + iOS Mobile-Bottom-Tab-Bar (4 Icons, Backdrop-Blur, Safe-Area), `main` hat `pb-24 md:pb-6`
- `src/pages/Home.tsx` - liest `?tab=` URL-Param (Bugfix: Tools/Funnels landeten beim Gleichen)
- `src/lib/dateFormat.ts` - geteiltes `formatDate`/`formatDateTime` (war 4x dupliziert)

### Backend
- `server/schema.ts` - `user` + `phone`/`businessName`/`websiteUrl`/`instagramHandle`/`gmbUrl` (nullable); `lead.userId` (FK ON DELETE SET NULL), `lead.emailSentAt`, `lead.emailError`; `funnel` (JSONB config); `app_setting` (secrets)
- `server/db.ts` - `initAuthSchema`/`initFunnelSchema`/`initAppSettings` (idempotente ALTER TABLE); `getUserById` (SELECT inkl. snake_case `business_name` etc.); Helpers: `setUserAsCustomer`, `trySetFirstUserAsSuperAdmin`, `approveUser`, `deleteUser`, `getAllUsers`, `hasSuperAdmin`, `getRawClient`
- `server/auth.ts` - `databaseHooks.user.create.after`: erster User -> super_admin, danach auto -> customer; `additionalFields` inkl. der 5 Praxis-Felder
- `server/me.ts` - `GET /` (User inkl. Praxis-Felder), `GET /leads`, `PATCH /` (Name + 5 Felder via `parseOptionalString`, slice 200 + trim)
- `server/middleware.ts` - geteiltes `requireAuth` + `requireRole(...allowed)` (war 3x dupliziert)
- `server/secrets.ts` - `encryptSecret`/`decryptSecret`/`getSetting`/`loadSmtpConfig`
- `server/settings.ts` - `GET/POST /api/admin/settings/smtp` + `/smtp/test`
- `server/pdf/leadReport.tsx` - `renderLeadReportPdf({funnelName, lead}): Promise<Buffer>`
- `server/mailer.ts` - `sendLeadReportEmail({to, leadName, funnelName, pdf})`
- `server/funnels.ts` - nach Lead-Insert: PDF rendern + Mail senden, stempelt `email_sent_at`/`email_error`; public Routes (`/by-slug/:slug`) VOR auth'd CRUD (Route-Ordering-Fix); `leadsCount` per SQL-Subquery statt denormalisierter Spalte (Race-Fix)
- `server/utils.ts` - geteiltes `isValidSlug` + `sanitizeString`

### Scripts / Tests
- `scripts/seed-potenzialanalyse.ts` - seedet Potenzialanalyse-Funnel (8 Dimensionen, 3 Calc-Inputs, Sie-Copy)
- `tests/e2e/`: `funnel-runner.spec.ts`, `customer-register.spec.ts`, `admin-view-switch.spec.ts`, `mobile-bottom-nav.spec.ts`, `full-walkthrough.spec.ts`

8 Spider-Dimensionen (Reihenfolge fix): Social Media | Website | Branding | Trust | Auffindbarkeit | Umsatzpotenzial | Mitarbeiter | Regionales Potenzial

## 6. Geloeste Bugs/Fallstricke (nicht erneut einfuehren)

- Deploy-2-Sek-Fail = kaputter `buildServerId` (s. Infra)
- Express Route-Ordering: public vor auth'd
- `leadsCount` Race -> SQL-Subquery
- Mobile Spider-Label-Clipping bei 390px -> Custom Spinnennetz statt Recharts (eigene viewBox-Mathematik)
- CTA-Booking-Step war unerreichbar -> `onNext`/`hasNextStep` Props an `ResultSpiderStep`
- "Tools"/"Funnels" gleiches Ziel -> `?tab=` Param + Nav umbenannt (Tools->Rechner)
- 17+ ASCII-Transliterationen + Em-Dashes -> mehrfach gesweept (loeschen, auswaehlen, fuer, aendern, moechten, vollstaendig, Strategiegespraech...)
- Duplikate eliminiert: `formatDate`(4x), `formatCurrency`(2x), `requireAuth`(3x), `Avatar`(4x), Lead-Interface(2x), `isValidSlug`/`sanitizeString`(2x)

---

## 7. Meine Prompts (chronologisch, gesammelt)

1. Hast du lokal Zugriff auf Kalku und den Dokploy-Server?
2. Setze das um - wir bauen das zu einem richtigen Funnel um! (BeautyFlow Potenzialanalyse)
3. Denk dran Agents zu nutzen, Code-Reviews zu machen, Code nicht zumuellen
4. Und Live-Tests, Feedback-Loop etc.
5. Branding-Folder mit Branding; alles 100% production-ready mit Tests + Feedback-Loops + Code-Reviews
6. Als Design-Beispiel, aber mit unseren Daten/Punkten (Screenshot)
7. Direkt zu Kunden-Dashboard ausbauen: registrieren -> Potenzialanalyse + Leitfaden (beauty-flow.de/blueprint)
8. Option 2; Fokus weg vom Baukasten, hin zum BeautyFlow-Kundensystem (Backend-Features + Dashboard)
9. Teste es lokal
10. Admin auf BeautyFlow rebranden (Option B)
11. Mach erst mal alles fertig
12. Sorg dafuer, dass Code schlank und ohne Duplicate laeuft
13. "Tools" und "Funnels" kommen am Ende beim Gleichen raus (Bug)
14. Login geht nicht mehr auf Dokploy + altes Rechner-Logo noch drin
15. Da soll auch unsere Version rein
16. Das ist noch die alte Version bei kalku.layer-one.io!
17. Soll eigentlich ueber GitHub auto-deployen
18. Der Funnel fehlt komplett
19. Ich sehe kein Kunden-Dashboard
20. Backend passt nicht zum Frontend
21. Rechner-Builder + custom Rechner + custom Funnel bleiben, aber neuer Funnel + Kunden-Dashboard sind der Fokus
22. Da muss noch mehr kommen
23. Admin-Dashboard ist halbfertig, noch altes Branding
24. Neue To-dos
25. Zieh dir das BeautyFlow-Logo etc. (beauty-flow.de)
26. Manuell mit Playwright testen, dann auf Kalku master deployen
27. Geh nochmal alles durch mit Live-Tests + Animationen, dann auf main pushen
28. Funnel-Ergebnis: erst Wachstums-Chart, dann Spider-Web-Profil - Apple-Production-Level; "wer man ist"-Fragen schon beim Signup
29. Auf Mobile wie bei Apple-Apps: Menue unten mit Icons
30. STOP! PAUSE! -> spaeter: Continue
31. Spinnennetz-Framer-Code als Spider-Vorschau, unsere Farbe, unsere 8 Punkte beibehalten
32. Ist das mit Registrieren/Login? Dann kann das alles in den Signup

---

## 8. Angeblich ERLEDIGT - bitte trotzdem nachpruefen

> Jeder Punkt = "claimed done". Per Live-Test (Playwright + Screenshot) + Code-Read verifizieren, BEVOR akzeptiert. Stimmt was nicht -> reparieren.

- [ ] Potenzialanalyse-Funnel (8-Dim + Kalku-Berechnung + Empfehlung) -> end-to-end durchklicken, Rechenlogik gegenpruefen
- [ ] Pivot zum Kundensystem; Rechner-Builder/Custom-Funnel erhalten -> beide Wege testen
- [ ] Kunden-Dashboard + Admin auf Branding v2 -> alle Seiten visuell, kein altes Logo/Farbe
- [ ] Spinnennetz-SVG (Reveal+Wiggle) statt Recharts -> Animation + Labels @390px, kein Clipping
- [ ] Apple-Result-Page (Chart-Hero -> Spider -> Empfehlung -> CTA) -> Reihenfolge/Hierarchie/CTA-Erreichbarkeit
- [ ] iOS Bottom-Tab-Bar + Backdrop-Blur -> Mobile-Test, Safe-Area
- [ ] SMTP -> PDF -> Mail -> mit echter SMTP einen Lead durchlaufen, Mail + PDF pruefen, `email_sent_at` gesetzt
- [ ] Praxis-Felder Signup + Account + Funnel-Prefill -> Signup-Roundtrip, Account-Save, Funnel pre-filled wenn eingeloggt
- [ ] Dedup -> grep auf verbliebene Duplikate (`formatDate`/`formatCurrency`/`requireAuth`/`Avatar`/Lead/utils)
- [ ] Deploy-Pipeline -> pruefen dass aktueller Commit WIRKLICH live ist (Bundle-Feature-Check via curl auf gehashtes JS), nicht nur "CI gruen"
- [ ] Umlaute / keine Em-Dashes -> Sweep `src` + `server` + Copy
- [ ] Role-Logik -> erster User = super_admin, danach auto-customer; Admin<->Dashboard View-Switch

## 9. OFFEN (umzusetzen)

- [ ] SMTP konfigurieren unter `/admin/settings` (Werte: Jonas) -> Versand-Pfad von dir live testen
- [ ] Passwort rotieren - im Chat geleakt (Jonas)
- [ ] Leitfaden-Content (Markdown, von Jonas) -> ersetzt 4 Platzhalter-Kapitel in `/dashboard/leitfaden`
- [ ] Bundle-Size: 1.7 MB JS-Chunk -> Code-Splitting / manualChunks

## 10. Definition of Done (pro Punkt)

Code sauber + dedup'd -> `tsc --noEmit` + `npm run build` gruen -> Playwright-Live-Test + Screenshot -> Commit (proper Umlaute, kein Em-Dash, Co-Author-Trailer) -> Push `master` -> live-verifiziert auf kalku.layer-one.io (Bundle-Feature-Check, nicht nur CI).

## 11. Letzter Stand

- HEAD `master`: `7108c3b` - feat(profile): Praxis-Angaben in Signup + Account + Funnel-Prefill (live verifiziert: Bundle enthaelt Praxis-Angaben + instagramHandle)
- Davor: `99c0c51` (Apple-Result + iOS-Tab), `3245a6e`, `3eb3b95`, `5093ca3`, `4b3b3bd` (Spinnennetz/SMTP/PDF/Mail)
