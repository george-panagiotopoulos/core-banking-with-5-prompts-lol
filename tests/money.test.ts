/**
 * Money Value Object Tests
 */

import { Money } from '../src/utils/money';

describe('Money', () => {
  describe('Creation', () => {
    it('should create Money from major units', () => {
      const money = Money.fromMajorUnits(100.50, 'USD');

      expect(money.amount).toBe(100.50);
      expect(money.currency).toBe('USD');
      expect(money.minorUnits).toBe(10050);
    });

    it('should create Money from minor units', () => {
      const money = Money.fromMinorUnits(10050, 'USD');

      expect(money.amount).toBe(100.50);
      expect(money.minorUnits).toBe(10050);
    });

    it('should create zero Money', () => {
      const money = Money.zero('EUR');

      expect(money.amount).toBe(0);
      expect(money.currency).toBe('EUR');
      expect(money.isZero()).toBe(true);
    });

    it('should handle JPY with no decimal places', () => {
      const money = Money.fromMajorUnits(1000, 'JPY');

      expect(money.amount).toBe(1000);
      expect(money.minorUnits).toBe(1000);
    });
  });

  describe('Arithmetic Operations', () => {
    it('should add two Money values', () => {
      const a = Money.fromMajorUnits(100, 'USD');
      const b = Money.fromMajorUnits(50.25, 'USD');

      const result = a.add(b);

      expect(result.amount).toBe(150.25);
    });

    it('should subtract two Money values', () => {
      const a = Money.fromMajorUnits(100, 'USD');
      const b = Money.fromMajorUnits(30.50, 'USD');

      const result = a.subtract(b);

      expect(result.amount).toBe(69.50);
    });

    it('should multiply Money by factor', () => {
      const money = Money.fromMajorUnits(100, 'USD');

      const result = money.multiply(1.5);

      expect(result.amount).toBe(150);
    });

    it('should divide Money by divisor', () => {
      const money = Money.fromMajorUnits(100, 'USD');

      const result = money.divide(4);

      expect(result.amount).toBe(25);
    });

    it('should throw error when dividing by zero', () => {
      const money = Money.fromMajorUnits(100, 'USD');

      expect(() => money.divide(0)).toThrow('Cannot divide by zero');
    });

    it('should calculate percentage', () => {
      const money = Money.fromMajorUnits(200, 'USD');

      const result = money.percentage(15);

      expect(result.amount).toBe(30);
    });
  });

  describe('Comparison Operations', () => {
    it('should compare greater than', () => {
      const a = Money.fromMajorUnits(100, 'USD');
      const b = Money.fromMajorUnits(50, 'USD');

      expect(a.isGreaterThan(b)).toBe(true);
      expect(b.isGreaterThan(a)).toBe(false);
    });

    it('should compare less than', () => {
      const a = Money.fromMajorUnits(50, 'USD');
      const b = Money.fromMajorUnits(100, 'USD');

      expect(a.isLessThan(b)).toBe(true);
      expect(b.isLessThan(a)).toBe(false);
    });

    it('should check equality', () => {
      const a = Money.fromMajorUnits(100.50, 'USD');
      const b = Money.fromMajorUnits(100.50, 'USD');
      const c = Money.fromMajorUnits(100.50, 'EUR');

      expect(a.equals(b)).toBe(true);
      expect(a.equals(c)).toBe(false);
    });

    it('should throw error when comparing different currencies', () => {
      const usd = Money.fromMajorUnits(100, 'USD');
      const eur = Money.fromMajorUnits(100, 'EUR');

      expect(() => usd.isGreaterThan(eur)).toThrow('Currency mismatch');
    });
  });

  describe('State Checks', () => {
    it('should check if positive', () => {
      const positive = Money.fromMajorUnits(100, 'USD');
      const negative = Money.fromMajorUnits(-100, 'USD');
      const zero = Money.zero('USD');

      expect(positive.isPositive()).toBe(true);
      expect(negative.isPositive()).toBe(false);
      expect(zero.isPositive()).toBe(false);
    });

    it('should check if negative', () => {
      const positive = Money.fromMajorUnits(100, 'USD');
      const negative = Money.fromMajorUnits(-100, 'USD');

      expect(positive.isNegative()).toBe(false);
      expect(negative.isNegative()).toBe(true);
    });

    it('should get absolute value', () => {
      const negative = Money.fromMajorUnits(-100, 'USD');

      expect(negative.abs().amount).toBe(100);
    });

    it('should negate value', () => {
      const positive = Money.fromMajorUnits(100, 'USD');

      expect(positive.negate().amount).toBe(-100);
    });
  });

  describe('Formatting', () => {
    it('should format as currency string', () => {
      const money = Money.fromMajorUnits(1234.56, 'USD');

      const formatted = money.format();

      expect(formatted).toBe('$1,234.56');
    });

    it('should convert to string', () => {
      const money = Money.fromMajorUnits(100.50, 'USD');

      expect(money.toString()).toBe('100.5 USD');
    });

    it('should serialize to JSON', () => {
      const money = Money.fromMajorUnits(100.50, 'USD');

      const json = money.toJSON();

      expect(json.amount).toBe(100.50);
      expect(json.currency).toBe('USD');
      expect(json.minorUnits).toBe(10050);
    });
  });

  describe('Precision Handling', () => {
    it('should handle floating point precision correctly', () => {
      const a = Money.fromMajorUnits(0.1, 'USD');
      const b = Money.fromMajorUnits(0.2, 'USD');

      const result = a.add(b);

      expect(result.amount).toBe(0.3);
    });

    it('should round to minor units correctly', () => {
      const money = Money.fromMajorUnits(10.999, 'USD');

      expect(money.minorUnits).toBe(1100); // Rounded
    });
  });
});
