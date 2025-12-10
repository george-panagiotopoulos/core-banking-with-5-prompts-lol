/**
 * Money utility functions for working with Money value objects
 */

import { Money, Currency } from './domain';

/**
 * Create a new Money value object
 */
export function createMoney(amount: number, currency: Currency, scale: number = 2): Money {
  if (amount < 0) {
    throw new Error('Amount cannot be negative');
  }
  return { amount, currency, scale };
}

/**
 * Add two Money values
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amount + b.amount, a.currency, a.scale);
}

/**
 * Subtract two Money values
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amount - b.amount, a.currency, a.scale);
}

/**
 * Compare if first Money is greater than second
 */
export function isGreaterThan(a: Money, b: Money): boolean {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot compare different currencies: ${a.currency} and ${b.currency}`);
  }
  return a.amount > b.amount;
}

/**
 * Compare if first Money is greater than or equal to second
 */
export function isGreaterThanOrEqual(a: Money, b: Money): boolean {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot compare different currencies: ${a.currency} and ${b.currency}`);
  }
  return a.amount >= b.amount;
}

/**
 * Check if two Money values are equal
 */
export function moneyEquals(a: Money, b: Money): boolean {
  return a.amount === b.amount && a.currency === b.currency && a.scale === b.scale;
}

/**
 * Format Money as string
 */
export function formatMoney(money: Money): string {
  const divisor = Math.pow(10, money.scale);
  const displayAmount = money.amount / divisor;
  return `${money.currency} ${displayAmount.toFixed(money.scale)}`;
}

/**
 * Convert Money to zero
 */
export function zeroMoney(currency: Currency, scale: number = 2): Money {
  return createMoney(0, currency, scale);
}

/**
 * Check if Money is zero
 */
export function isZero(money: Money): boolean {
  return money.amount === 0;
}
