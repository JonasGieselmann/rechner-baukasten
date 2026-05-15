# BeautyFlow Brand System

Visual identity for the BeautyFlow customer portal (everything served at
`/dashboard/*`, `/funnel/:slug`, and customer-facing entry pages). This is
the source of truth. Anything that ships on a customer surface follows what
is in this folder.

> Reference layout: [`reference-intro-hero.png`](./reference-intro-hero.png)
> (The reference image uses the older Du copy; the actual app uses Sie.)

---

## Voice

- **Anrede: Sie**. Niemals Du auf Customer-Surfaces. Internal admin chrome may stay Du.
- Cliffhanger, weckt Neugier, kein Marktgeschrei.
- Keine Em-Dashes. Komma, Doppelpunkt, Klammern, neue Sätze.
- Akzentwörter in Headlines kommen zwischen `*Sternchen*` im Funnel-Config-Title und werden im Frontend automatisch in Instrument Serif italic gerendert (siehe `src/lib/textFormat.tsx` und `.brand-accent` in `src/index.css`).

## Farben

Source of truth: [`tokens.ts`](./tokens.ts) `BRAND.colors`. Mirror in
`src/types/index.ts` `DEFAULT_FUNNEL_THEME`.

| Token-Key      | Hex       | Rolle                                                    |
| -------------- | --------- | -------------------------------------------------------- |
| `background`   | `#F7FAFF` | Porzellan-Weiß, Background der Customer-Seiten           |
| `primary`      | `#0F2F5B` | Deep Navy, Headlines, Body-Text, CTA-Background          |
| `text`         | `#0F2F5B` | identisch mit `primary`, semantischer Alias              |
| `accent`       | `#7EC8F3` | Light Blue, Spider-Web Fill/Stroke, Active States        |
| `dark`         | `#04070D` | Charcoal Black, NUR Admin-Chrome, nicht auf Customer     |
| `card`         | `#FFFFFF` | Karten-Background auf Porzellan-Seite                    |
| `border`       | `#E0E7F2` | dezenter navy-tinted border                              |
| `muted`        | `#5A7090` | gedämpfter Navy für Sekundärtext, Captions               |

CTAs auf Customer-Side: Navy-Pill (`bg: BRAND.colors.primary`, `text: BRAND.colors.background`),
nicht Schwarz.

## Typografie

Loaded in [`../index.html`](../index.html) via Google Fonts.

- **Inter** (400, 500, 600, 700) für Headings (Medium) und Body (Regular)
- **Instrument Serif** (regular + italic) für Akzentwörter in Headlines

| Element        | Größe       | Gewicht / Stil                            |
| -------------- | ----------- | ----------------------------------------- |
| H1             | 38–44 px    | Inter Medium + Instrument Serif Italic    |
| H2             | 28–36 px    | Inter Semibold                            |
| H3             | 20–26 px    | Inter Semibold                            |
| Body           | 16–18 px    | Inter Regular                             |
| Caption / Hint | 12–14 px    | Inter Regular, `color: muted`             |

## Components

### Pill CTA (Navy)

```tsx
<button
  className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
  style={{ backgroundColor: BRAND.colors.primary, color: BRAND.colors.background }}
>
  Jetzt Potenzial erkunden
  <span aria-hidden="true">↪</span>
</button>
```

### Spider-Web (Recharts)

```tsx
<RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
  <PolarGrid stroke={theme.borderColor} />
  <PolarAngleAxis dataKey="subject" tick={{ fill: theme.textColor, fontSize: 11, opacity: 0.7 }} />
  <Radar dataKey="score" stroke={theme.accentColor} fill={theme.accentColor} fillOpacity={0.35} />
</RadarChart>
```

`fillOpacity` 0.35 auf dem Intro-Demo, 0.25 auf dem echten Result.

## Spider-Dimensionen (clockwise ab oben)

Diese acht müssen `SPIDER_DIMENSIONS` in `src/types/index.ts` exakt entsprechen.

1. Social Media
2. Website
3. Branding
4. Trust
5. Auffindbarkeit
6. Umsatzpotenzial
7. Mitarbeiter
8. Regionales Potenzial

## Layout

- Mobile-first. Hero auf Mobile gestackt (Chart über Text), Desktop 2 Spalten ab `md:`.
- Step-Übergänge: kein Full-Screen-Takeover, gleiche Seite.
- Progressbar oben mit `accent`-Fill auf `border`-Track.

## Out of Scope

- Kein Dark Mode auf Customer-Side. Dark Kalku-Chrome bleibt admin-only.
- Keine Mehrsprachigkeit (nur Deutsch, Sie).
- Keine Preisanzeige im Funnel oder im Lead-Magnet-PDF.

## Where this is enforced

- `tokens.ts` (this folder) – Source of Truth
- `src/index.css` – Body-Defaults und `.brand-accent` Klasse
- `src/types/index.ts` – `DEFAULT_FUNNEL_THEME` aus `BRAND.colors` abgeleitet
- `src/pages/FunnelRunner.tsx` – IntroStep + Card + PrimaryButton
- `src/pages/customer/*` – Layout, Overview, Account, Leitfaden
- `scripts/seed-potenzialanalyse.ts` – Funnel-Copy in Sie-Form

Wenn ein Token hier geändert wird, muss er in `tokens.ts` und `src/types/index.ts` zugleich aktualisiert werden.
