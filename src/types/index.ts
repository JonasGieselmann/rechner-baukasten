import { BRAND } from '../../branding/tokens';

// Block Types
export type BlockType =
  | 'text'
  | 'input'
  | 'slider'
  | 'result'
  | 'chart'
  | 'comparison';

// Base Block Interface
export interface BaseBlock {
  id: string;
  type: BlockType;
  order: number;
}

// Text Block
export interface TextBlock extends BaseBlock {
  type: 'text';
  content: string;
  size: 'h1' | 'h2' | 'h3' | 'body';
}

// Input Block
export interface InputBlock extends BaseBlock {
  type: 'input';
  label: string;
  variableName: string;
  defaultValue: number;
  suffix: string;
  min: number;
  max: number;
}

// Slider Block
export interface SliderBlock extends BaseBlock {
  type: 'slider';
  label: string;
  variableName: string;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  suffix: string;
}

// Result Block
export interface ResultBlock extends BaseBlock {
  type: 'result';
  label: string;
  formula: string;
  format: 'number' | 'currency' | 'percent';
  size: 'small' | 'medium' | 'large';
  color: 'default' | 'accent' | 'success' | 'warning';
}

// Chart Block
export interface ChartBlock extends BaseBlock {
  type: 'chart';
  title: string;
  chartType: 'area' | 'bar' | 'line';
  dataFormula: string; // Formula: "beforeFormula:afterFormula"
  beforeLabel: string;
  afterLabel: string;
  // Format options
  yAxisFormat?: 'number' | 'currency' | 'percent';
  xAxisType?: 'months' | 'numbers' | 'quarters';
  xAxisCount?: number; // Number of data points (default 12)
}

// Comparison Block
export interface ComparisonBlock extends BaseBlock {
  type: 'comparison';
  title: string;
  rows: ComparisonRow[];
}

export interface ComparisonRow {
  id: string;
  label: string;
  beforeFormula: string;
  afterFormula: string;
  format: 'number' | 'currency' | 'percent' | 'text';
}

// Union type for all blocks
export type Block =
  | TextBlock
  | InputBlock
  | SliderBlock
  | ResultBlock
  | ChartBlock
  | ComparisonBlock;

// Calculator Configuration
export interface CalculatorConfig {
  id: string;
  name: string;
  description: string;
  blocks: Block[];
  variables: Record<string, number>;
  theme: ThemeConfig;
  createdAt: Date;
  updatedAt: Date;
}

// Theme Configuration
export interface ThemeConfig {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  borderColor: string;
}

// Default Theme
export const DEFAULT_THEME: ThemeConfig = {
  primaryColor: '#7EC8F3',
  accentColor: '#a6daff',
  backgroundColor: '#0a0a0f',
  cardColor: '#12121a',
  textColor: '#ffffff',
  borderColor: '#1f1f2e',
};

// ============================================
// Funnel-Builder Types
// ============================================

export type FunnelStatus = 'draft' | 'published' | 'archived';

export type FunnelStepType =
  | 'intro'
  | 'lead-capture'
  | 'question'
  | 'calc-input'
  | 'result-spider'
  | 'cta-booking';

export interface BaseStep {
  id: string;
  type: FunnelStepType;
  title?: string;
  body?: string;
}

export interface IntroStep extends BaseStep {
  type: 'intro';
  ctaLabel?: string;
}

export type LeadField =
  | 'name'
  | 'email'
  | 'phone'
  | 'businessName'
  | 'websiteUrl'
  | 'instagramHandle'
  | 'gmbUrl';

export interface LeadCaptureStep extends BaseStep {
  type: 'lead-capture';
  fields: { key: LeadField; label: string; required: boolean }[];
  ctaLabel?: string;
  privacyNote?: string;
}

export type SpiderDimension =
  | 'social-media'
  | 'website'
  | 'branding'
  | 'trust'
  | 'auffindbarkeit'
  | 'umsatzpotenzial'
  | 'mitarbeiter'
  | 'regional';

export interface AnswerOption {
  id: string;
  label: string;
  score: number; // 0..100
  // Optional: selecting this option seeds the question's calcVariable with this
  // numeric value (e.g. a "Termine/Woche: 10-20" answer seeds terminePerWeek=15).
  calcValue?: number;
}

export interface QuestionStep extends BaseStep {
  type: 'question';
  question: string;
  dimension: SpiderDimension; // contributes to this dimension
  options: AnswerOption[];
  allowMultiple?: boolean;
  required?: boolean;
  // Optional: the answer also pre-fills this calc variable (used to seed the
  // interactive sliders shown on the result step) from the chosen option's calcValue.
  calcVariable?: string;
}

export interface CalcInputStep extends BaseStep {
  type: 'calc-input';
  label: string;
  variableName: string;
  inputType: 'number' | 'slider';
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

// Interactive slider shown on the result step, pre-filled from funnel answers.
export interface CalcSlider {
  variableName: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export interface ResultSpiderStep extends BaseStep {
  type: 'result-spider';
  showKalkuChart?: boolean;
  cliffhanger?: string;
  // Sliders the user can "play with" on the result (seeded from the funnel
  // answers via QuestionStep.calcVariable); the growth numbers update live.
  calcInputs?: CalcSlider[];
}

export interface CtaBookingStep extends BaseStep {
  type: 'cta-booking';
  ctaLabel: string;
  calendarUrl: string;
  noteUnderButton?: string;
}

export type FunnelStep =
  | IntroStep
  | LeadCaptureStep
  | QuestionStep
  | CalcInputStep
  | ResultSpiderStep
  | CtaBookingStep;

export interface FunnelTheme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardColor: string;
  textColor: string;
  borderColor: string;
}

export interface FunnelSettings {
  progressBar: boolean;
  ctaCalendarUrl: string;
}

export interface FunnelConfig {
  theme: FunnelTheme;
  settings: FunnelSettings;
  steps: FunnelStep[];
}

export interface Funnel {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  status: FunnelStatus;
  config: FunnelConfig;
  leadsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  funnelId: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  businessName: string | null;
  websiteUrl: string | null;
  instagramHandle: string | null;
  gmbUrl: string | null;
  answers: Record<string, string[]>;
  scores: Partial<Record<SpiderDimension, number>>;
  recommendation: string | null;
  kalkuPotential: Record<string, number> | null;
  scrapeData: Record<string, unknown> | null;
  scrapeStatus: 'pending' | 'queued' | 'running' | 'done' | 'error' | 'skipped';
  pdfUrl: string | null;
  source: string | null;
  status: string;
  utm: Record<string, string> | null;
  createdAt: string;
}

export const DEFAULT_FUNNEL_THEME: FunnelTheme = {
  mode: 'light',
  primaryColor: BRAND.colors.primary,
  accentColor: BRAND.colors.accent,
  backgroundColor: BRAND.colors.background,
  cardColor: BRAND.colors.card,
  textColor: BRAND.colors.text,
  borderColor: BRAND.colors.border,
};

export const SPIDER_DIMENSIONS: { key: SpiderDimension; label: string }[] = [
  { key: 'social-media', label: 'Social Media' },
  { key: 'website', label: 'Website' },
  { key: 'branding', label: 'Branding' },
  { key: 'trust', label: 'Trust' },
  { key: 'auffindbarkeit', label: 'Auffindbarkeit' },
  { key: 'umsatzpotenzial', label: 'Umsatzpotenzial' },
  { key: 'mitarbeiter', label: 'Mitarbeiter' },
  { key: 'regional', label: 'Regionales Potenzial' },
];

export const DEFAULT_LEAD_FIELDS: { key: LeadField; label: string; required: boolean }[] = [
  { key: 'name', label: 'Ihr Name', required: true },
  { key: 'email', label: 'E-Mail', required: true },
  { key: 'phone', label: 'Telefon', required: false },
  { key: 'businessName', label: 'Praxisname', required: true },
  { key: 'websiteUrl', label: 'Website-URL', required: true },
  { key: 'instagramHandle', label: 'Instagram-Handle', required: false },
  { key: 'gmbUrl', label: 'Google-My-Business / Praxis + Stadt', required: false },
];
