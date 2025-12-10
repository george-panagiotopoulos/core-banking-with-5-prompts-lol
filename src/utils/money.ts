/**
 * Money value object for precise financial calculations
 * Uses integer representation to avoid floating point errors
 */
export class Money {
  private readonly amountInMinorUnits: number;
  private readonly currencyCode: string;
  private readonly decimalPlaces: number;

  private static readonly CURRENCY_DECIMALS: Record<string, number> = {
    USD: 2,
    EUR: 2,
    GBP: 2,
    JPY: 0,
    CHF: 2,
  };

  private constructor(amountInMinorUnits: number, currency: string) {
    this.currencyCode = currency.toUpperCase();
    this.decimalPlaces = Money.CURRENCY_DECIMALS[this.currencyCode] ?? 2;
    this.amountInMinorUnits = Math.round(amountInMinorUnits);
  }

  /**
   * Create Money from major units (e.g., dollars)
   */
  static fromMajorUnits(amount: number, currency: string): Money {
    const decimals = Money.CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
    const minorUnits = Math.round(amount * Math.pow(10, decimals));
    return new Money(minorUnits, currency);
  }

  /**
   * Create Money from minor units (e.g., cents)
   */
  static fromMinorUnits(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  /**
   * Create zero Money
   */
  static zero(currency: string): Money {
    return new Money(0, currency);
  }

  /**
   * Get amount in major units
   */
  get amount(): number {
    return this.amountInMinorUnits / Math.pow(10, this.decimalPlaces);
  }

  /**
   * Get amount in minor units
   */
  get minorUnits(): number {
    return this.amountInMinorUnits;
  }

  /**
   * Get currency code
   */
  get currency(): string {
    return this.currencyCode;
  }

  /**
   * Add another Money value
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountInMinorUnits + other.amountInMinorUnits, this.currencyCode);
  }

  /**
   * Subtract another Money value
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountInMinorUnits - other.amountInMinorUnits, this.currencyCode);
  }

  /**
   * Multiply by a factor
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this.amountInMinorUnits * factor), this.currencyCode);
  }

  /**
   * Divide by a divisor
   */
  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Money(Math.round(this.amountInMinorUnits / divisor), this.currencyCode);
  }

  /**
   * Calculate percentage
   */
  percentage(percent: number): Money {
    return this.multiply(percent / 100);
  }

  /**
   * Check if this Money is greater than another
   */
  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInMinorUnits > other.amountInMinorUnits;
  }

  /**
   * Check if this Money is greater than or equal to another
   */
  isGreaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInMinorUnits >= other.amountInMinorUnits;
  }

  /**
   * Check if this Money is less than another
   */
  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInMinorUnits < other.amountInMinorUnits;
  }

  /**
   * Check if this Money is less than or equal to another
   */
  isLessThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amountInMinorUnits <= other.amountInMinorUnits;
  }

  /**
   * Check if this Money equals another
   */
  equals(other: Money): boolean {
    return (
      this.currencyCode === other.currencyCode &&
      this.amountInMinorUnits === other.amountInMinorUnits
    );
  }

  /**
   * Check if amount is zero
   */
  isZero(): boolean {
    return this.amountInMinorUnits === 0;
  }

  /**
   * Check if amount is positive
   */
  isPositive(): boolean {
    return this.amountInMinorUnits > 0;
  }

  /**
   * Check if amount is negative
   */
  isNegative(): boolean {
    return this.amountInMinorUnits < 0;
  }

  /**
   * Get absolute value
   */
  abs(): Money {
    return new Money(Math.abs(this.amountInMinorUnits), this.currencyCode);
  }

  /**
   * Negate the amount
   */
  negate(): Money {
    return new Money(-this.amountInMinorUnits, this.currencyCode);
  }

  /**
   * Format as string with currency symbol
   */
  format(): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currencyCode,
      minimumFractionDigits: this.decimalPlaces,
      maximumFractionDigits: this.decimalPlaces,
    });
    return formatter.format(this.amount);
  }

  /**
   * Convert to JSON-serializable object
   */
  toJSON(): { amount: number; currency: string; minorUnits: number } {
    return {
      amount: this.amount,
      currency: this.currencyCode,
      minorUnits: this.amountInMinorUnits,
    };
  }

  /**
   * String representation
   */
  toString(): string {
    return `${this.amount} ${this.currencyCode}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currencyCode !== other.currencyCode) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this.currencyCode} and ${other.currencyCode}`
      );
    }
  }
}
