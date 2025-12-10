/**
 * LedgerService Class
 * High-level service for managing ledger operations
 * Handles transaction recording, account statements, and reconciliation
 */

import { Ledger } from './ledger';
import { LedgerEntry } from './ledger-entry';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  EntryType,
  ReconciliationResult,
  ValidationError,
  DoubleEntryViolationError,
  InsufficientFundsError
} from '../core/domain';

export class LedgerService {
  private ledger: Ledger;

  constructor(ledger?: Ledger) {
    this.ledger = ledger || new Ledger();
  }

  /**
   * Records a transaction in the ledger by creating debit and credit entries
   * Implements double-entry bookkeeping rules
   */
  public recordTransaction(transaction: Transaction): LedgerEntry[] {
    this.validateTransaction(transaction);

    if (transaction.status !== TransactionStatus.COMPLETED) {
      throw new ValidationError(
        `Cannot record transaction with status: ${transaction.status}. ` +
        `Only COMPLETED transactions can be recorded.`
      );
    }

    const entries: LedgerEntry[] = [];

    switch (transaction.type) {
      case TransactionType.DEPOSIT:
        entries.push(...this.recordDeposit(transaction));
        break;

      case TransactionType.WITHDRAWAL:
        entries.push(...this.recordWithdrawal(transaction));
        break;

      case TransactionType.TRANSFER:
        entries.push(...this.recordTransfer(transaction));
        break;

      case TransactionType.PAYMENT:
        entries.push(...this.recordPayment(transaction));
        break;

      case TransactionType.FEE:
        entries.push(...this.recordFee(transaction));
        break;

      case TransactionType.INTEREST:
        entries.push(...this.recordInterest(transaction));
        break;

      case TransactionType.ADJUSTMENT:
        entries.push(...this.recordAdjustment(transaction));
        break;

      default:
        throw new ValidationError(`Unsupported transaction type: ${transaction.type}`);
    }

    // Add all entries to the ledger
    entries.forEach(entry => this.ledger.addEntry(entry));

    return entries;
  }

  /**
   * Gets an account statement for a date range
   */
  public getAccountStatement(
    accountId: string,
    fromDate: Date,
    toDate: Date
  ): LedgerEntry[] {
    if (!accountId || accountId.trim() === '') {
      throw new ValidationError('Account ID is required');
    }

    if (fromDate > toDate) {
      throw new ValidationError('From date cannot be after to date');
    }

    const entries = this.ledger.getAccountEntriesByDateRange(accountId, fromDate, toDate);

    // Sort by date ascending
    return entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Reconciles an account and returns the reconciliation result
   */
  public reconcileAccount(accountId: string): ReconciliationResult {
    if (!accountId || accountId.trim() === '') {
      throw new ValidationError('Account ID is required');
    }

    const balance = this.ledger.calculateBalance(accountId);
    const entries = this.ledger.getEntriesByAccount(accountId);

    // Calculate the expected balance from entries
    const expectedBalance = entries.reduce((sum, entry) => {
      return sum + entry.getSignedAmount();
    }, 0);

    const isBalanced = Math.abs(balance.net - expectedBalance) < 0.01;
    const discrepancy = balance.net - expectedBalance;

    return {
      accountId,
      totalDebits: balance.debit,
      totalCredits: balance.credit,
      netBalance: balance.net,
      expectedBalance: Math.round(expectedBalance * 100) / 100,
      isBalanced,
      discrepancy: Math.round(discrepancy * 100) / 100,
      entryCount: entries.length,
      reconciledAt: new Date()
    };
  }

  /**
   * Gets the current ledger instance
   */
  public getLedger(): Ledger {
    return this.ledger;
  }

  /**
   * Records a deposit transaction
   */
  private recordDeposit(transaction: Transaction): LedgerEntry[] {
    if (!transaction.destinationAccountId) {
      throw new ValidationError('Deposit requires a destination account');
    }

    // Debit: Cash/Bank (asset increases)
    const debitEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.destinationAccountId,
      entryType: EntryType.DEBIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Deposit: ${transaction.description}`
    });

    // Credit: Source (liability/equity increases or another asset decreases)
    const creditEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.sourceAccountId || 'EXTERNAL',
      entryType: EntryType.CREDIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Deposit source: ${transaction.description}`
    });

    this.ledger.validateDoubleEntry(debitEntry, creditEntry);
    return [debitEntry, creditEntry];
  }

  /**
   * Records a withdrawal transaction
   */
  private recordWithdrawal(transaction: Transaction): LedgerEntry[] {
    if (!transaction.sourceAccountId) {
      throw new ValidationError('Withdrawal requires a source account');
    }

    // Credit: Account (asset decreases)
    const creditEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.sourceAccountId,
      entryType: EntryType.CREDIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Withdrawal: ${transaction.description}`
    });

    // Debit: Cash/External (asset increases or expense)
    const debitEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.destinationAccountId || 'EXTERNAL',
      entryType: EntryType.DEBIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Withdrawal destination: ${transaction.description}`
    });

    this.ledger.validateDoubleEntry(debitEntry, creditEntry);
    return [debitEntry, creditEntry];
  }

  /**
   * Records a transfer transaction
   */
  private recordTransfer(transaction: Transaction): LedgerEntry[] {
    if (!transaction.sourceAccountId || !transaction.destinationAccountId) {
      throw new ValidationError('Transfer requires both source and destination accounts');
    }

    // Credit: Source account (asset decreases)
    const creditEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.sourceAccountId,
      entryType: EntryType.CREDIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Transfer to ${transaction.destinationAccountId}: ${transaction.description}`
    });

    // Debit: Destination account (asset increases)
    const debitEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.destinationAccountId,
      entryType: EntryType.DEBIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Transfer from ${transaction.sourceAccountId}: ${transaction.description}`
    });

    this.ledger.validateDoubleEntry(debitEntry, creditEntry);
    return [debitEntry, creditEntry];
  }

  /**
   * Records a payment transaction
   */
  private recordPayment(transaction: Transaction): LedgerEntry[] {
    if (!transaction.sourceAccountId) {
      throw new ValidationError('Payment requires a source account');
    }

    // Credit: Source account (asset decreases)
    const creditEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.sourceAccountId,
      entryType: EntryType.CREDIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Payment: ${transaction.description}`
    });

    // Debit: Expense or payee account
    const debitEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.destinationAccountId || 'PAYMENT_EXPENSE',
      entryType: EntryType.DEBIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Payment expense: ${transaction.description}`
    });

    this.ledger.validateDoubleEntry(debitEntry, creditEntry);
    return [debitEntry, creditEntry];
  }

  /**
   * Records a fee transaction
   */
  private recordFee(transaction: Transaction): LedgerEntry[] {
    if (!transaction.sourceAccountId) {
      throw new ValidationError('Fee requires a source account');
    }

    // Credit: Customer account (asset decreases)
    const creditEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.sourceAccountId,
      entryType: EntryType.CREDIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Fee: ${transaction.description}`
    });

    // Debit: Fee revenue account (revenue increases)
    const debitEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: 'FEE_REVENUE',
      entryType: EntryType.DEBIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Fee revenue: ${transaction.description}`
    });

    this.ledger.validateDoubleEntry(debitEntry, creditEntry);
    return [debitEntry, creditEntry];
  }

  /**
   * Records an interest transaction
   */
  private recordInterest(transaction: Transaction): LedgerEntry[] {
    if (!transaction.destinationAccountId) {
      throw new ValidationError('Interest requires a destination account');
    }

    // Debit: Customer account (asset increases)
    const debitEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.destinationAccountId,
      entryType: EntryType.DEBIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Interest earned: ${transaction.description}`
    });

    // Credit: Interest expense account (expense increases)
    const creditEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: 'INTEREST_EXPENSE',
      entryType: EntryType.CREDIT,
      amount: transaction.amount,
      currency: transaction.currency,
      description: `Interest expense: ${transaction.description}`
    });

    this.ledger.validateDoubleEntry(debitEntry, creditEntry);
    return [debitEntry, creditEntry];
  }

  /**
   * Records an adjustment transaction
   */
  private recordAdjustment(transaction: Transaction): LedgerEntry[] {
    if (!transaction.destinationAccountId) {
      throw new ValidationError('Adjustment requires a destination account');
    }

    const isPositive = transaction.amount >= 0;

    // For positive adjustments: Debit the account (increase)
    // For negative adjustments: Credit the account (decrease)
    const accountEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: transaction.destinationAccountId,
      entryType: isPositive ? EntryType.DEBIT : EntryType.CREDIT,
      amount: Math.abs(transaction.amount),
      currency: transaction.currency,
      description: `Adjustment: ${transaction.description}`
    });

    // Opposite entry to adjustment account
    const adjustmentEntry = new LedgerEntry({
      transactionId: transaction.id,
      accountId: 'ADJUSTMENT_ACCOUNT',
      entryType: isPositive ? EntryType.CREDIT : EntryType.DEBIT,
      amount: Math.abs(transaction.amount),
      currency: transaction.currency,
      description: `Adjustment offset: ${transaction.description}`
    });

    if (isPositive) {
      this.ledger.validateDoubleEntry(accountEntry, adjustmentEntry);
      return [accountEntry, adjustmentEntry];
    } else {
      this.ledger.validateDoubleEntry(adjustmentEntry, accountEntry);
      return [adjustmentEntry, accountEntry];
    }
  }

  /**
   * Validates transaction data
   */
  private validateTransaction(transaction: Transaction): void {
    if (!transaction) {
      throw new ValidationError('Transaction is required');
    }

    if (!transaction.id) {
      throw new ValidationError('Transaction ID is required');
    }

    if (!transaction.type) {
      throw new ValidationError('Transaction type is required');
    }

    if (transaction.amount === undefined || transaction.amount === null) {
      throw new ValidationError('Transaction amount is required');
    }

    if (transaction.amount < 0) {
      throw new ValidationError('Transaction amount cannot be negative');
    }

    if (!transaction.currency) {
      throw new ValidationError('Transaction currency is required');
    }
  }
}
