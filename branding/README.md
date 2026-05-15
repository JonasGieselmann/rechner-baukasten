# Kalku Funnel Branding

Visual identity for the Kalku Funnel-Builder. This is the source of truth for
designers, agents, and reviewers. Anything that ships on `kalku.layer-one.io`
or in embedded funnels follows what is in this folder.

> Reference image: [`reference-intro-hero.png`](./reference-intro-hero.png)

---

## Voice

- Cliffhanger, makes the reader curious, never overpromises.
- Speaks Du. No corporate.
- No em-dashes. Use commas, colons, hyphens, or new sentences.
- Accent words in headlines can be italicized via `*asterisks*` in the funnel
  config. The runner converts these to `<em>` with `italic font-medium`.

## Color tokens

These match `DEFAULT_FUNNEL_THEME` in `src/types/index.ts` and the default
seed config in `scripts/seed-potenzialanalyse.ts`.

| Token             | Hex       | Role                                                  |
| ----------------- | --------- | ----------------------------------------------------- |
| `backgroundColor` | `#ffffff` | Page background                                       |
| `cardColor`       | `#f7f7f8` | Step cards on white page (lead-capture, question ...) |
| `textColor`       | `#0a0a0a` | Headlines and body                                    |
| `primaryColor`    | `#0a0a0a` | CTAs background                                       |
| `accentColor`     | `#7EC8F3` | Spider-web fill / stroke, success states              |
| `borderColor`     | `#e6e8eb` | Card borders, dividers                                |

The hero on the intro-step is full-bleed on the white page, not boxed.
Other steps render inside a `max-w-xl` card with `cardColor` background.

## Typography

- Family: system sans-serif (inherits the Vite + Tailwind v4 default).
- Hero headline: `text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight`.
- Hero subline: `text-sm opacity-60` ("kostenlos in 2 Minuten" pattern).
- Body: `text-base opacity-70 leading-relaxed`.
- Step titles in cards: `text-2xl font-semibold`.

## Components

### Pill CTA (black)

```tsx
<button className="inline-flex items-center gap-2 px-6 py-3 rounded-full
                   bg-black text-white text-sm font-semibold
                   hover:bg-neutral-800 transition-colors">
  Jetzt Potenzial erkunden
  <span aria-hidden="true">↪</span>
</button>
```

This is the CTA on the intro hero. CTAs inside lead-capture and question
cards use the accent-color `PrimaryButton` instead, to keep the intro
visually special.

### Spider-web (Recharts)

```tsx
<RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
  <PolarGrid stroke={theme.borderColor} />
  <PolarAngleAxis dataKey="subject" tick={{ fill: theme.textColor, fontSize: 11, opacity: 0.7 }} />
  <Radar dataKey="score" stroke={theme.accentColor} fill={theme.accentColor} fillOpacity={0.35} />
</RadarChart>
```

`fillOpacity` 0.35 on the intro demo, 0.25 on the real result. The demo
hints at the result without revealing actual scores; the result is the
real Spider for the user.

## Spider dimensions (in clockwise order, starting at the top)

These must stay in sync with `SPIDER_DIMENSIONS` in `src/types/index.ts`.

1. Social Media
2. Website
3. Branding
4. Trust
5. Auffindbarkeit
6. Umsatzpotenzial
7. Mitarbeiter
8. Regionales Potenzial

## Layout

- Mobile first. Hero is stacked on mobile (chart appears above text), grid
  splits into 2 columns at `md:` breakpoint (chart right, text left).
- Step transitions: keep on the same page, no full-screen takeover.
- Progress bar lives at the top of the viewport and uses `accentColor` fill
  on a `borderColor` track.

## Out of scope

- No dark mode in the public funnel runner. The editor (dashboard side) is
  dark by design and is the only place where the dark Kalku chrome appears.
- No multi-language. German only.
- No price reveal anywhere on the funnel or in the lead-magnet PDF.

## Where this is enforced

- `src/types/index.ts` :: `DEFAULT_FUNNEL_THEME`
- `src/pages/FunnelRunner.tsx` :: `IntroStep`, `Card`, `PrimaryButton`,
  `renderTitleWithItalics`
- `scripts/seed-potenzialanalyse.ts` :: intro copy and theme

If you change any token in this README, change it in those files too.
