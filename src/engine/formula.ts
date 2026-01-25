/**
 * Formula Engine - Parses and evaluates formulas with variables
 *
 * Syntax: {variableName} for variables
 * Supports: +, -, *, /, %, (), Math functions
 *
 * Examples:
 * - {leads} * {conversionRate} / 100
 * - ({revenue} - {costs}) / {costs} * 100
 * - Math.max({value1}, {value2})
 */

export class FormulaEngine {
  private variables: Record<string, number>;

  constructor(variables: Record<string, number> = {}) {
    this.variables = variables;
  }

  /**
   * Update variables
   */
  setVariables(variables: Record<string, number>) {
    this.variables = { ...this.variables, ...variables };
  }

  /**
   * Get all variables
   */
  getVariables(): Record<string, number> {
    return { ...this.variables };
  }

  /**
   * Set a single variable
   */
  setVariable(name: string, value: number) {
    this.variables[name] = value;
  }

  /**
   * Evaluate a formula string
   */
  evaluate(formula: string): number {
    if (!formula || formula.trim() === '') {
      return 0;
    }

    try {
      // Replace {variableName} with actual values
      let expression = formula.replace(/\{(\w+)\}/g, (_, varName) => {
        const value = this.variables[varName];
        if (value === undefined) {
          console.warn(`Variable "${varName}" not found, using 0`);
          return '0';
        }
        return String(value);
      });

      // Sanitize: only allow safe characters
      if (!/^[\d\s+\-*/().,%Math.maxminroundfloorceillabspow]+$/i.test(expression.replace(/Math\.\w+/g, ''))) {
        console.warn('Invalid characters in formula');
        return 0;
      }

      // Create a safe evaluation context
      const safeEval = new Function(
        'Math',
        `"use strict"; return (${expression});`
      );

      const result = safeEval(Math);

      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return 0;
      }

      return result;
    } catch (error) {
      console.warn('Formula evaluation error:', error);
      return 0;
    }
  }

  /**
   * Extract variable names from a formula
   */
  static extractVariables(formula: string): string[] {
    const matches = formula.match(/\{(\w+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
  }

  /**
   * Validate a formula (check syntax)
   */
  static validate(formula: string): { valid: boolean; error?: string } {
    try {
      // Replace variables with dummy values for validation
      const testFormula = formula.replace(/\{(\w+)\}/g, '1');

      // Try to parse it
      new Function(`"use strict"; return (${testFormula});`);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid formula'
      };
    }
  }
}

// Formatting utilities
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
