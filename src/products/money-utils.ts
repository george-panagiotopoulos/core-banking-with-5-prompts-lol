/**
 * Money Utilities
 * Helper functions for working with Money value objects
 */

import { Money, Currency } from '../core/domain';

/**
 * Create a new Money value object
 */
export function createMoney(amount: number, currency: Currency = Currency.USD, scale: number = 2): Money {
  if (amount < 0) {
    throw new Error('Money amount cannot be negative');
  }

  return {
    amount,
    currency,
    scale
  };
}

/**
 * Add two Money values
 */
export function addMoney(a: Money, b: Money): Money {
  validateCurrency(a, b);
  return createMoney(a.amount + b.amount, a.currency, a.scale);
}

/**
 * Subtract two Money values
 */
export function subtractMoney(a: Money, b: Money): Money {
  validateCurrency(a, b);
  return createMoney(Math.max(0, a.amount - b.amount), a.currency, a.scale);
}

/**
 * Multiply Money by a factor
 */
export function multiplyMoney(money: Money, factor: number): Money {
  return createMoney(money.amount * factor, money.currency, money.scale);
}

/**
 * Divide Money by a divisor
 */
export function divideMoney(money: Money, divisor: number): Money {
  if (divisor === 0) {
    throw new Error('Cannot divide by zero');
  }
  return createMoney(money.amount / divisor, money.currency, money.scale);
}

/**
 * Check if first Money is greater than second
 */
export function isGreaterThan(a: Money, b: Money): boolean {
  validateCurrency(a, b);
  return a.amount > b.amount;
}

/**
 * Check if first Money is less than second
 */
export function isLessThan(a: Money, b: Money): boolean {
  validateCurrency(a, b);
  return a.amount < b.amount;
}

/**
 * Check if two Money values are equal
 */
export function moneyEquals(a: Money, b: Money): boolean {
  return a.amount === b.amount && a.currency === b.currency;
}

/**
 * Format Money as a string
 */
export function formatMoney(money: Money): string {
  const formatted = (money.amount / Math.pow(10, money.scale)).toFixed(money.scale);
  return `${money.currency} ${formatted}`;
}

/**
 * Validate that two Money values have the same currency
 */
function validateCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}

/**
 * Convert Money to base units (for storage/comparison)
 */
export function toBaseUnits(amount: number, scale: number = 2): number {
  return Math.round(amount * Math.pow(10, scale));
}

/**
 * Convert from base units to decimal amount
 */
export function fromBaseUnits(baseUnits: number, scale: number = 2): number {
  return baseUnits / Math.pow(10, scale);
}

/**
 * Parse Money from a string
 */
export function parseMoney(str: string, currency: Currency = Currency.USD): Money {
  const amount = parseFloat(str);
  if (isNaN(amount)) {
    throw new Error(`Invalid money string: ${str}`);
  }
  return createMoney(toBaseUnits(amount), currency);
}

/**
 * Create Money from decimal amount
 */
export function moneyFromDecimal(amount: number, currency: Currency = Currency.USD): Money {
  return createMoney(toBaseUnits(amount), currency);
}

/**
 * Get the decimal value of Money
 */
export function toDecimal(money: Money): number {
  return fromBaseUnits(money.amount, money.scale);
}
