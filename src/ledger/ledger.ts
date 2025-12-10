/**
 * Ledger Class
 * Manages the double-entry bookkeeping ledger
 * Ensures that every transaction has balanced debit and credit entries
 */

import { LedgerEntry } from './ledger-entry';
import {
  EntryType,
  BalanceCalculation,
  DoubleEntryViolationError,
  ValidationError
} from '../core/domain';

export class Ledger {
  private entries: LedgerEntry[] = [];
  private readonly PRECISION = 0.01; // Tolerance for floating-point comparison

  /**
   * Adds a validated entry to the ledger
   */
  public addEntry(entry: LedgerEntry): void {
    if (!entry) {
      throw new ValidationError('Entry cannot be null or undefined');
    }

    if (!(entry instanceof LedgerEntry)) {
      throw new ValidationError('Entry must be an instance of LedgerEntry');
    }

    this.entries.push(entry);
  }

  /**
   * Gets all entries for a specific account
   */
  public getEntriesByAccount(accountId: string): LedgerEntry[] {
    if (!accountId || accountId.trim() === '') {
      throw new ValidationError('Account ID is required');
    }

    return this.entries.filter(entry => entry.accountId === accountId);
  }

  /**
   * Gets all entries for a specific transaction
   */
  public getEntriesByTransaction(transactionId: string): LedgerEntry[] {
    if (!transactionId || transactionId.trim() === '') {
      throw new ValidationError('Transaction ID is required');
    }

    return this.entries.filter(entry => entry.transactionId === transactionId);
  }

  /**
   * Calculates the balance for an account
   * Returns debit total, credit total, and net balance
   */
  public calculateBalance(accountId: string): BalanceCalculation {
    if (!accountId || accountId.trim() === '') {
      throw new ValidationError('Account ID is required');
    }

    const accountEntries = this.getEntriesByAccount(accountId);

    const debit = accountEntries
      .filter(entry => entry.isDebit())
      .reduce((sum, entry) => sum + entry.amount, 0);

    const credit = accountEntries
      .filter(entry => entry.isCredit())
      .reduce((sum, entry) => sum + entry.amount, 0);

    const net = credit - debit;

    return {
      debit: this.roundToPrecision(debit),
      credit: this.roundToPrecision(credit),
      net: this.roundToPrecision(net)
    };
  }

  /**
   * Validates that a debit and credit entry form a valid double-entry pair
   */
  public validateDoubleEntry(debitEntry: LedgerEntry, creditEntry: LedgerEntry): boolean {
    if (!debitEntry || !creditEntry) {
      throw new ValidationError('Both debit and credit entries are required');
    }

    // Verify entry types
    if (!debitEntry.isDebit()) {
      throw new DoubleEntryViolationError('First entry must be a DEBIT');
    }

    if (!creditEntry.isCredit()) {
      throw new DoubleEntryViolationError('Second entry must be a CREDIT');
    }

    // Verify same transaction
    if (debitEntry.transactionId !== creditEntry.transactionId) {
      throw new DoubleEntryViolationError(
        `Entries must belong to the same transaction. ` +
        `Debit: ${debitEntry.transactionId}, Credit: ${creditEntry.transactionId}`
      );
    }

    // Verify same currency
    if (debitEntry.currency !== creditEntry.currency) {
      throw new DoubleEntryViolationError(
        `Entries must use the same currency. ` +
        `Debit: ${debitEntry.currency}, Credit: ${creditEntry.currency}`
      );
    }

    // Verify balanced amounts
    if (!this.amountsAreEqual(debitEntry.amount, creditEntry.amount)) {
      throw new DoubleEntryViolationError(
        `Debit and credit amounts must be equal. ` +
        `Debit: ${debitEntry.amount}, Credit: ${creditEntry.amount}`
      );
    }

    return true;
  }

  /**
   * Gets all entries in the ledger
   */
  public getAllEntries(): LedgerEntry[] {
    return [...this.entries];
  }

  /**
   * Gets the total number of entries
   */
  public getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Verifies the integrity of the entire ledger
   * Ensures all debits equal all credits
   */
  public verifyLedgerBalance(): boolean {
    const totalDebits = this.entries
      .filter(entry => entry.isDebit())
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalCredits = this.entries
      .filter(entry => entry.isCredit())
      .reduce((sum, entry) => sum + entry.amount, 0);

    if (!this.amountsAreEqual(totalDebits, totalCredits)) {
      throw new DoubleEntryViolationError(
        `Ledger is unbalanced. Total debits: ${totalDebits}, Total credits: ${totalCredits}`
      );
    }

    return true;
  }

  /**
   * Gets entries within a date range
   */
  public getEntriesByDateRange(fromDate: Date, toDate: Date): LedgerEntry[] {
    if (fromDate > toDate) {
      throw new ValidationError('From date cannot be after to date');
    }

    return this.entries.filter(entry =>
      entry.createdAt >= fromDate && entry.createdAt <= toDate
    );
  }

  /**
   * Gets entries for an account within a date range
   */
  public getAccountEntriesByDateRange(
    accountId: string,
    fromDate: Date,
    toDate: Date
  ): LedgerEntry[] {
    const accountEntries = this.getEntriesByAccount(accountId);

    return accountEntries.filter(entry =>
      entry.createdAt >= fromDate && entry.createdAt <= toDate
    );
  }

  /**
   * Clears all entries (for testing purposes)
   */
  public clear(): void {
    this.entries = [];
  }

  /**
   * Compares two amounts with precision tolerance
   */
  private amountsAreEqual(amount1: number, amount2: number): boolean {
    return Math.abs(amount1 - amount2) < this.PRECISION;
  }

  /**
   * Rounds a number to the defined precision
   */
  private roundToPrecision(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Gets summary statistics for the ledger
   */
  public getSummary(): {
    totalEntries: number;
    totalDebits: number;
    totalCredits: number;
    uniqueAccounts: number;
    uniqueTransactions: number;
  } {
    const uniqueAccounts = new Set(this.entries.map(e => e.accountId)).size;
    const uniqueTransactions = new Set(this.entries.map(e => e.transactionId)).size;

    const totalDebits = this.entries
      .filter(entry => entry.isDebit())
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalCredits = this.entries
      .filter(entry => entry.isCredit())
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      totalEntries: this.entries.length,
      totalDebits: this.roundToPrecision(totalDebits),
      totalCredits: this.roundToPrecision(totalCredits),
      uniqueAccounts,
      uniqueTransactions
    };
  }
}
