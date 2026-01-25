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
  dataFormula: string; // Formula that returns array data
  beforeLabel: string;
  afterLabel: string;
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
