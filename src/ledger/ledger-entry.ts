/**
 * LedgerEntry Class
 * Represents a single entry in the double-entry bookkeeping system
 */

import {
  LedgerEntryData,
  EntryType,
  ValidationError
} from '../core/domain';
import { v4 as uuidv4 } from 'uuid';

export class LedgerEntry {
  public readonly id: string;
  public readonly transactionId: string;
  public readonly accountId: string;
  public readonly entryType: EntryType;
  public readonly amount: number;
  public readonly currency: string;
  public readonly description: string;
  public readonly balance: number;
  public readonly metadata: Record<string, any>;
  public readonly createdAt: Date;

  constructor(data: LedgerEntryData) {
    this.validate(data);

    this.id = data.id || uuidv4();
    this.transactionId = data.transactionId;
    this.accountId = data.accountId;
    this.entryType = data.entryType;
    this.amount = this.normalizeAmount(data.amount);
    this.currency = data.currency.toUpperCase();
    this.description = data.description;
    this.balance = data.balance || 0;
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
  }

  /**
   * Validates entry data before construction
   */
  private validate(data: LedgerEntryData): void {
    if (!data.transactionId || data.transactionId.trim() === '') {
      throw new ValidationError('Transaction ID is required');
    }

    if (!data.accountId || data.accountId.trim() === '') {
      throw new ValidationError('Account ID is required');
    }

    if (!Object.values(EntryType).includes(data.entryType)) {
      throw new ValidationError(`Invalid entry type: ${data.entryType}. Must be DEBIT or CREDIT`);
    }

    if (data.amount === undefined || data.amount === null) {
      throw new ValidationError('Amount is required');
    }

    if (typeof data.amount !== 'number') {
      throw new ValidationError('Amount must be a number');
    }

    if (data.amount < 0) {
      throw new ValidationError('Amount cannot be negative');
    }

    if (!isFinite(data.amount)) {
      throw new ValidationError('Amount must be a finite number');
    }

    if (!data.currency || data.currency.trim() === '') {
      throw new ValidationError('Currency is required');
    }

    if (!/^[A-Z]{3}$/.test(data.currency.toUpperCase())) {
      throw new ValidationError('Currency must be a 3-letter ISO code (e.g., USD, EUR)');
    }

    if (!data.description || data.description.trim() === '') {
      throw new ValidationError('Description is required');
    }
  }

  /**
   * Normalizes amount to 2 decimal places for currency precision
   */
  private normalizeAmount(amount: number): number {
    return Math.round(amount * 100) / 100;
  }

  /**
   * Formats the entry for display
   */
  public format(): string {
    const sign = this.entryType === EntryType.DEBIT ? '-' : '+';
    const formattedAmount = this.formatCurrency(this.amount);
    const formattedBalance = this.formatCurrency(this.balance);
    const date = this.createdAt.toISOString().split('T')[0];

    return [
      `[${date}]`,
      `${this.entryType.padEnd(6)}`,
      `${sign}${formattedAmount.padStart(12)}`,
      `${this.currency}`,
      `Balance: ${formattedBalance}`,
      `- ${this.description}`
    ].join(' ');
  }

  /**
   * Formats currency with 2 decimal places
   */
  private formatCurrency(amount: number): string {
    return amount.toFixed(2);
  }

  /**
   * Returns a plain object representation
   */
  public toJSON(): LedgerEntryData {
    return {
      id: this.id,
      transactionId: this.transactionId,
      accountId: this.accountId,
      entryType: this.entryType,
      amount: this.amount,
      currency: this.currency,
      description: this.description,
      balance: this.balance,
      metadata: this.metadata,
      createdAt: this.createdAt
    };
  }

  /**
   * Creates a reversal entry for this entry
   */
  public createReversal(reversalTransactionId: string): LedgerEntry {
    const reversalType = this.entryType === EntryType.DEBIT
      ? EntryType.CREDIT
      : EntryType.DEBIT;

    return new LedgerEntry({
      transactionId: reversalTransactionId,
      accountId: this.accountId,
      entryType: reversalType,
      amount: this.amount,
      currency: this.currency,
      description: `Reversal: ${this.description}`,
      metadata: {
        ...this.metadata,
        originalEntryId: this.id,
        reversalOf: this.transactionId
      }
    });
  }

  /**
   * Checks if this entry is a debit
   */
  public isDebit(): boolean {
    return this.entryType === EntryType.DEBIT;
  }

  /**
   * Checks if this entry is a credit
   */
  public isCredit(): boolean {
    return this.entryType === EntryType.CREDIT;
  }

  /**
   * Returns the signed amount (negative for debit, positive for credit)
   */
  public getSignedAmount(): number {
    return this.isDebit() ? -this.amount : this.amount;
  }
}
