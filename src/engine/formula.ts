/**
 * Formula Engine - Parses and evaluates formulas with variables
 * Uses expr-eval library (CSP-safe, no eval/new Function)
 *
 * Syntax: {variableName} for variables
 * Supports: +, -, *, /, %, (), Math functions
 *
 * Examples:
 * - {leads} * {conversionRate} / 100
 * - ({revenue} - {costs}) / {costs} * 100
 * - max({value1}, {value2})
 */

import { Parser } from 'expr-eval';

// Create a parser instance with default functions
const parser = new Parser();

export class FormulaEngine {
  private variables: Record<string, number>;

  constructor(variables: Record<string, number> = {}) {
    this.variables = variables;
  }

  setVariables(variables: Record<string, number>) {
    this.variables = { ...this.variables, ...variables };
  }

  getVariables(): Record<string, number> {
    return { ...this.variables };
  }

  setVariable(name: string, value: number) {
    this.variables[name] = value;
  }

  /**
   * Evaluate a formula string (CSP-safe via expr-eval)
   */
  evaluate(formula: string): number {
    if (!formula || formula.trim() === '') {
      return 0;
    }

    try {
      // Step 1: Replace {variableName} with actual variable names for expr-eval
      // expr-eval uses plain variable names, not {wrapped}
      const expression = formula.replace(/\{(\w+)\}/g, (_, varName) => {
        // Just use the variable name directly - we'll pass variables to evaluate
        return varName;
      });

      // Step 2: Parse and evaluate with expr-eval
      const parsed = parser.parse(expression);
      const result = parsed.evaluate(this.variables);

      // Step 3: Validate result
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        return 0;
      }

      return result;
    } catch (error) {
      // For simple numbers, try direct parsing
      const trimmed = formula.trim();
      const num = parseFloat(trimmed);
      if (!isNaN(num) && Number.isFinite(num)) {
        return num;
      }
      console.warn('Formula evaluation error:', error);
      return 0;
    }
  }

  static extractVariables(formula: string): string[] {
    const matches = formula.match(/\{(\w+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  }

  static validate(formula: string): { valid: boolean; error?: string } {
    try {
      const testFormula = formula.replace(/\{(\w+)\}/g, 'x');
      parser.parse(testFormula);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid formula'
      };
    }
  }
}

// ============================================
// Formatting utilities
// ============================================

export function formatNumber(value: number, decimals: number = 1): string {
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 0)}%`;
}

export function formatValue(
  value: number,
  format: 'number' | 'currency' | 'percent'
): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    default:
      return formatNumber(value);
  }
}
