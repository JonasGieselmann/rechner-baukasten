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
 *
 * Security: Uses strict whitelist-based validation to prevent code injection
 */

// ============================================
// Security: Whitelist of allowed Math functions
// ============================================
const ALLOWED_MATH_FUNCTIONS = new Set([
  'abs', 'ceil', 'floor', 'round', 'trunc',
  'max', 'min', 'pow', 'sqrt', 'cbrt',
  'log', 'log10', 'log2', 'exp',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh',
  'sign', 'random',
  'PI', 'E',
]);

// Dangerous patterns that should NEVER appear in formulas
const DANGEROUS_PATTERNS = [
  /constructor/i,
  /prototype/i,
  /__proto__/i,
  /\[\s*['"`]/,          // Bracket notation with strings: obj["prop"]
  /\[\s*\w+\s*\]/,       // Bracket notation: obj[prop]
  /\.\s*\(/,             // Method chaining that's not Math: .something()
  /`/,                   // Template literals
  /\\/,                  // Escape characters
  /\$\{/,                // Template interpolation
  /import|require|eval|Function/i,
  /window|document|global|process|this/i,
  /fetch|XMLHttpRequest|WebSocket/i,
  /localStorage|sessionStorage|cookie/i,
];

/**
 * Validate that a Math function call is safe
 */
function isValidMathCall(funcName: string): boolean {
  return ALLOWED_MATH_FUNCTIONS.has(funcName);
}

/**
 * Sanitize and validate expression for safe evaluation
 * Returns null if expression is unsafe
 */
function sanitizeExpression(expression: string): string | null {
  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(expression)) {
      console.warn(`Dangerous pattern detected in formula: ${pattern}`);
      return null;
    }
  }

  // Validate all Math.xxx calls use whitelisted functions
  const mathCalls = expression.match(/Math\.(\w+)/g);
  if (mathCalls) {
    for (const call of mathCalls) {
      const funcName = call.replace('Math.', '');
      if (!isValidMathCall(funcName)) {
        console.warn(`Invalid Math function: ${funcName}`);
        return null;
      }
    }
  }

  // After removing valid Math calls, check remaining characters
  // Only allow: digits, whitespace, operators, parentheses, comma, decimal point
  const withoutMath = expression.replace(/Math\.\w+/g, '0');
  if (!/^[\d\s+\-*/().,%]+$/.test(withoutMath)) {
    console.warn('Invalid characters in formula after Math removal');
    return null;
  }

  // Additional check: no consecutive operators (except minus for negative numbers)
  if (/[+*/]{2,}|[+*/]\s*[+*/]/.test(expression)) {
    console.warn('Invalid operator sequence in formula');
    return null;
  }

  return expression;
}

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
   * Uses strict sanitization to prevent code injection
   */
  evaluate(formula: string): number {
    if (!formula || formula.trim() === '') {
      return 0;
    }

    try {
      // Step 1: Replace {variableName} with actual numeric values
      const expression = formula.replace(/\{(\w+)\}/g, (_, varName) => {
        const value = this.variables[varName];
        if (value === undefined) {
          console.warn(`Variable "${varName}" not found, using 0`);
          return '0';
        }
        // Ensure value is a finite number
        const numValue = Number(value);
        if (!Number.isFinite(numValue)) {
          return '0';
        }
        return String(numValue);
      });

      // Step 2: Sanitize expression (returns null if unsafe)
      const sanitized = sanitizeExpression(expression);
      if (sanitized === null) {
        return 0;
      }

      // Step 3: Create a frozen Math object with only whitelisted functions
      const safeMath: Record<string, unknown> = {};
      for (const func of ALLOWED_MATH_FUNCTIONS) {
        const mathValue = Math[func as keyof typeof Math];
        if (mathValue !== undefined) {
          safeMath[func] = mathValue;
        }
      }
      Object.freeze(safeMath);

      // Step 4: Evaluate with restricted scope
      const safeEval = new Function(
        'Math',
        `"use strict"; return (${sanitized});`
      );

      const result = safeEval(safeMath);

      // Step 5: Validate result is a safe number
      if (typeof result !== 'number' || !Number.isFinite(result)) {
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
   * Validate a formula (check syntax and security)
   */
  static validate(formula: string): { valid: boolean; error?: string } {
    try {
      // Replace variables with dummy values for validation
      const testFormula = formula.replace(/\{(\w+)\}/g, '1');

      // Check security constraints
      const sanitized = sanitizeExpression(testFormula);
      if (sanitized === null) {
        return { valid: false, error: 'Formula contains invalid or dangerous patterns' };
      }

      // Try to parse it
      new Function(`"use strict"; return (${sanitized});`);

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
