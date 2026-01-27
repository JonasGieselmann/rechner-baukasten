# Rechner-Baukasten - Projekt-Kontext

> No-Code-Tool zum Erstellen interaktiver Rechner mit Drag-and-Drop (Notion + Grid.is Style)

---

## Tech Stack

### Frontend
- **React 19** - UI Framework
- **TypeScript** - Type Safety
- **Vite 7** - Build Tool & Dev Server
- **Tailwind CSS v4** - Utility-First Styling

### State Management
- **Zustand** - Lightweight State Management
- **LocalStorage** - Client-Side Persistence (wird später durch DB ersetzt)

### Drag & Drop
- **@dnd-kit/core** - Core DnD Functionality
- **@dnd-kit/sortable** - Sortable Lists
- **@dnd-kit/utilities** - CSS Utilities

### Visualisierung
- **Recharts** - Charts & Graphs
- **Framer Motion** - Animations

### Utilities
- **nanoid** - ID Generation
- **xlsx (SheetJS)** - Excel/CSV Import
- **react-router-dom** - Client-Side Routing

---

## Projektstruktur

```
src/
├── main.tsx                 # App Entry Point
├── App.tsx                  # Router Setup
├── index.css               # Global Styles + Tailwind
│
├── components/
│   ├── index.ts            # Component Exports
│   ├── BlockRenderer.tsx   # Block Wrapper mit DnD
│   ├── DropZone.tsx        # Drop Indicator zwischen Blöcken
│   ├── EditorCanvas.tsx    # Hauptbereich mit Blöcken
│   ├── EditorLayout.tsx    # Editor Layout mit DnD Context
│   ├── ImportModal.tsx     # Excel/CSV Import Dialog
│   ├── PropertiesPanel.tsx # Rechte Sidebar für Block-Eigenschaften
│   ├── Sidebar.tsx         # Linke Sidebar mit Block-Palette
│   ├── Toolbar.tsx         # Top Bar mit Navigation & Actions
│   │
│   └── blocks/
│       ├── index.ts
│       ├── TextBlockRenderer.tsx
│       ├── InputBlockRenderer.tsx
│       ├── SliderBlockRenderer.tsx
│       ├── ResultBlockRenderer.tsx
│       ├── ChartBlockRenderer.tsx
│       └── ComparisonBlockRenderer.tsx
│
├── pages/
│   ├── Home.tsx            # Dashboard mit Rechner-Liste
│   └── Editor.tsx          # Editor mit Autosave
│
├── store/
│   └── calculatorStore.ts  # Zustand Store (State + Actions)
│
├── engine/
│   └── formula.ts          # Formel-Parser & Evaluator
│
└── types/
    └── index.ts            # TypeScript Interfaces & Types
```

---

## Wichtige Dateien

### State Management
**`src/store/calculatorStore.ts`**
- Zentraler Zustand für die gesamte App
- Actions: `addBlock`, `updateBlock`, `deleteBlock`, `reorderBlocks`
- Persistenz: `saveCalculator`, `loadCalculator`, `loadSavedCalculators`
- LocalStorage Key: `rechner-baukasten-calculators`

### Formel-Engine
**`src/engine/formula.ts`**
- Parst Formeln mit `{variableName}` Syntax
- Unterstützt: `+`, `-`, `*`, `/`, `%`, `()`, `Math.*`
- Sichere Evaluation ohne `eval()`
- Formatierung: `formatCurrency()`, `formatPercent()`, `formatNumber()`

### Block-Types
**`src/types/index.ts`**
```typescript
type BlockType = 'text' | 'input' | 'slider' | 'result' | 'chart' | 'comparison';

interface TextBlock { content: string; size: 'h1' | 'h2' | 'h3' | 'body' }
interface InputBlock { label: string; variableName: string; defaultValue: number; ... }
interface SliderBlock { label: string; variableName: string; min/max/step: number; ... }
interface ResultBlock { label: string; formula: string; format: 'number' | 'currency' | 'percent'; ... }
interface ChartBlock { title: string; chartType: 'area' | 'bar' | 'line'; dataFormula: string; ... }
interface ComparisonBlock { title: string; rows: ComparisonRow[] }
```

---

## Design System

### Farben
```css
--bg-primary: #04070d;       /* Haupthintergrund */
--bg-card: #10131c;          /* Karten-Hintergrund */
--bg-input: #1a1a24;         /* Input-Hintergrund */
--border-default: #1f1f2e;   /* Standard-Border */
--border-hover: #2a2a3a;     /* Hover-Border */
--text-primary: #ffffff;     /* Haupttext */
--text-secondary: #b8c7d9;   /* Sekundärtext */
--text-muted: #6b7a90;       /* Gedämpfter Text */
--accent-primary: #7EC8F3;   /* Hauptakzent (Hellblau) */
--accent-light: #a6daff;     /* Heller Akzent */
```

### Typografie
- Font: Inter (Google Fonts)
- Heading 1: `text-4xl font-bold`
- Heading 2: `text-2xl font-semibold`
- Heading 3: `text-lg font-semibold`
- Body: `text-base`
- Small: `text-sm`
- Tiny: `text-xs`

### Abstände
- Card Padding: `p-6` (1.5rem)
- Section Gap: `gap-6` (1.5rem)
- Input Gap: `gap-3` (0.75rem)

### Border Radius
- Cards: `rounded-2xl` (1rem)
- Buttons: `rounded-lg` (0.5rem)
- Inputs: `rounded-lg` (0.5rem)
- Pills: `rounded-full`

---

## Konventionen

### Komponenten
- PascalCase: `BlockRenderer.tsx`
- Funktionale Komponenten mit TypeScript
- Props-Interface am Anfang der Datei

### State
- Zustand für globalen State
- `useState` für lokalen UI-State
- Keine Props-Drilling (Store direkt in Komponenten)

### Styling
- Tailwind Utility Classes
- Keine separaten CSS-Dateien pro Komponente
- Responsive: `sm:`, `md:`, `lg:` Breakpoints

### Formeln
- Variablen in geschweiften Klammern: `{variableName}`
- Nur alphanumerisch + Unterstriche: `/^[a-zA-Z_][a-zA-Z0-9_]*$/`

---

## Referenz-Projekt

**BeautyFlow ROI-Rechner**
`B:\Visual Studio\interaktiver_rechner\beautyflow-rechner`

Features zum Übernehmen:
- 12-Monats-Projektion Chart mit Gradient Fill
- Vorher/Nachher Vergleich
- Custom Tooltips
- ROI-Berechnung

---

## Commands

```bash
# Development
npm run dev          # Start Dev Server (Port 5173/5174)

# Build
npm run build        # TypeScript Check + Vite Build
npm run preview      # Preview Production Build

# Lint
npm run lint         # ESLint Check

# Type Check
npx tsc --noEmit     # TypeScript ohne Build
```

---

## Known Issues

1. **CSS @import Warning**: Google Fonts Import nach Tailwind Output
   - Fix: Fonts in `index.html` statt `index.css` laden

2. **Node.js Version**: Vite 7 benötigt Node.js 20.19+ oder 22.12+
   - Warnung erscheint, funktioniert aber

---

## Nächste Schritte

Siehe `ROADMAP.md` für detaillierte Task-Liste.
