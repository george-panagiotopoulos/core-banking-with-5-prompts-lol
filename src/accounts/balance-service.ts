/**
 * Balance Service
 * Manages account balances, holds, and balance calculations
 */

import { Account } from './account';
import { AccountRepository } from './account-service';
import {
  Money,
  Balance,
  LedgerEntry,
  EntryType,
  Currency
} from '../core/domain';
import {
  ValidationError,
  InsufficientFundsError,
  AccountInactiveError
} from '../core/errors';

export interface BalanceRepository {
  getBalance(accountId: string): Promise<Balance | null>;
  updateBalance(balance: Balance): Promise<void>;
  addHold(accountId: string, holdId: string, amount: Money): Promise<void>;
  removeHold(accountId: string, holdId: string): Promise<void>;
  getHolds(accountId: string): Promise<Map<string, Money>>;
}

export interface AuditLogger {
  log(entry: {
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    changes?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<void>;
}

export class BalanceService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly balanceRepository: BalanceRepository,
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Retrieves the current balance for an account
   */
  async getBalance(accountId: string): Promise<Balance> {
    if (!accountId || accountId.trim().length === 0) {
      throw new ValidationError('Account ID is required', ['accountId']);
    }

    const balance = await this.balanceRepository.getBalance(accountId);

    if (!balance) {
      // Initialize balance if not exists
      const account = await this.accountRepository.findById(accountId);

      if (!account) {
        throw new ValidationError(`Account not found: ${accountId}`, [accountId]);
      }

      const now = new Date();
      const initialBalance: Balance = {
        accountId,
        ledgerBalance: account.getLedgerBalance(),
        availableBalance: account.getAvailableBalance(),
        pendingBalance: { amount: 0, currency: account.currency, scale: this.getCurrencyScale(account.currency) },
        heldBalance: { amount: 0, currency: account.currency, scale: this.getCurrencyScale(account.currency) },
        currency: account.currency,
        lastUpdatedAt: now,
        lastPostingDate: now,
        overdraftUsage: null,
        version: 1
      };

      await this.balanceRepository.updateBalance(initialBalance);
      return initialBalance;
    }

    return balance;
  }

  /**
   * Updates balance based on a ledger entry
   */
  async updateBalance(accountId: string, ledgerEntry: LedgerEntry): Promise<Balance> {
    // Validate entry
    this.validateLedgerEntry(ledgerEntry);

    if (ledgerEntry.accountId !== accountId) {
      throw new ValidationError(
        'Ledger entry account ID does not match provided account ID',
        [`Expected: ${accountId}`, `Received: ${ledgerEntry.accountId}`]
      );
    }

    // Get account
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new ValidationError(`Account not found: ${accountId}`, [accountId]);
    }

    // Ensure account can transact
    if (!account.canTransact()) {
      throw new AccountInactiveError(accountId, account.status);
    }

    // Get current balance
    const balance = await this.getBalance(accountId);

    // Calculate new balance
    const newLedgerBalance = this.calculateNewLedgerBalance(
      balance.ledgerBalance,
      ledgerEntry
    );

    // Validate sufficient funds for debits
    if (ledgerEntry.entryType === EntryType.DEBIT) {
      if (newLedgerBalance.amount < 0) {
        throw new InsufficientFundsError(
          accountId,
          ledgerEntry.amount.amount.toString(),
          balance.ledgerBalance.amount.toString()
        );
      }
    }

    // Calculate new available balance
    const newAvailableBalance: Money = {
      amount: this.roundAmount(newLedgerBalance.amount - balance.heldBalance.amount - balance.pendingBalance.amount),
      currency: newLedgerBalance.currency,
      scale: this.getCurrencyScale(newLedgerBalance.currency)
    };

    // Update balance
    const now = new Date();
    const updatedBalance: Balance = {
      ...balance,
      ledgerBalance: newLedgerBalance,
      availableBalance: newAvailableBalance,
      lastUpdatedAt: now,
      lastPostingDate: ledgerEntry.postingDate,
      version: balance.version + 1
    };

    await this.balanceRepository.updateBalance(updatedBalance);

    // Update account entity
    account.updateBalances(
      newLedgerBalance,
      newAvailableBalance,
      balance.heldBalance
    );
    account.recordActivity();
    await this.accountRepository.update(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Balance',
      entityId: accountId,
      action: 'UPDATE',
      actor: 'system',
      changes: {
        ledgerEntry: {
          id: ledgerEntry.id,
          type: ledgerEntry.entryType,
          amount: ledgerEntry.amount
        },
        previousBalance: balance.ledgerBalance,
        newBalance: newLedgerBalance
      },
      metadata: {
        transactionId: ledgerEntry.transactionId
      }
    });

    return updatedBalance;
  }

  /**
   * Places a hold on funds
   */
  async holdFunds(accountId: string, amount: Money, holdId?: string): Promise<string> {
    // Validate
    this.validateMoney(amount);

    if (amount.amount <= 0) {
      throw new ValidationError('Hold amount must be positive', ['amount']);
    }

    // Get account
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new ValidationError(`Account not found: ${accountId}`, [accountId]);
    }

    if (!account.canTransact()) {
      throw new AccountInactiveError(accountId, account.status);
    }

    // Validate currency matches
    if (amount.currency !== account.currency) {
      throw new ValidationError(
        'Hold currency must match account currency',
        [`Account currency: ${account.currency}`, `Hold currency: ${amount.currency}`]
      );
    }

    // Get current balance
    const balance = await this.getBalance(accountId);

    // Check available balance
    if (balance.availableBalance.amount < amount.amount) {
      throw new InsufficientFundsError(
        accountId,
        amount.amount.toString(),
        balance.availableBalance.amount.toString()
      );
    }

    // Generate hold ID if not provided
    const generatedHoldId = holdId || `HOLD-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Place hold
    await this.balanceRepository.addHold(accountId, generatedHoldId, amount);

    // Update balance
    const newHeldBalance: Money = {
      amount: balance.heldBalance.amount + amount.amount,
      currency: amount.currency,
      scale: this.getCurrencyScale(amount.currency)
    };

    const newAvailableBalance: Money = {
      amount: this.roundAmount(balance.ledgerBalance.amount - newHeldBalance.amount - balance.pendingBalance.amount),
      currency: balance.currency,
      scale: this.getCurrencyScale(balance.currency)
    };

    const updatedBalance: Balance = {
      ...balance,
      heldBalance: newHeldBalance,
      availableBalance: newAvailableBalance,
      lastUpdatedAt: new Date(),
      version: balance.version + 1
    };

    await this.balanceRepository.updateBalance(updatedBalance);

    // Update account entity
    account.updateBalances(
      balance.ledgerBalance,
      newAvailableBalance,
      newHeldBalance
    );
    await this.accountRepository.update(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Balance',
      entityId: accountId,
      action: 'HOLD_FUNDS',
      actor: 'system',
      metadata: {
        holdId: generatedHoldId,
        amount,
        previousHoldAmount: balance.heldBalance,
        newHoldAmount: newHeldBalance
      }
    });

    return generatedHoldId;
  }

  /**
   * Releases a hold on funds
   */
  async releaseFunds(accountId: string, holdId: string): Promise<void> {
    if (!holdId || holdId.trim().length === 0) {
      throw new ValidationError('Hold ID is required', ['holdId']);
    }

    // Get account
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new ValidationError(`Account not found: ${accountId}`, [accountId]);
    }

    // Get current holds
    const holds = await this.balanceRepository.getHolds(accountId);
    const holdAmount = holds.get(holdId);

    if (!holdAmount) {
      throw new ValidationError(`Hold not found: ${holdId}`, [holdId]);
    }

    // Remove hold
    await this.balanceRepository.removeHold(accountId, holdId);

    // Get current balance
    const balance = await this.getBalance(accountId);

    // Update balance
    const newHeldBalance: Money = {
      amount: Math.max(0, balance.heldBalance.amount - holdAmount.amount),
      currency: balance.heldBalance.currency,
      scale: this.getCurrencyScale(balance.heldBalance.currency)
    };

    const newAvailableBalance: Money = {
      amount: this.roundAmount(balance.ledgerBalance.amount - newHeldBalance.amount - balance.pendingBalance.amount),
      currency: balance.currency,
      scale: this.getCurrencyScale(balance.currency)
    };

    const updatedBalance: Balance = {
      ...balance,
      heldBalance: newHeldBalance,
      availableBalance: newAvailableBalance,
      lastUpdatedAt: new Date(),
      version: balance.version + 1
    };

    await this.balanceRepository.updateBalance(updatedBalance);

    // Update account entity
    account.updateBalances(
      balance.ledgerBalance,
      newAvailableBalance,
      newHeldBalance
    );
    await this.accountRepository.update(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Balance',
      entityId: accountId,
      action: 'RELEASE_FUNDS',
      actor: 'system',
      metadata: {
        holdId,
        releasedAmount: holdAmount,
        previousHoldAmount: balance.heldBalance,
        newHeldBalance
      }
    });
  }

  /**
   * Calculates available balance
   */
  async calculateAvailableBalance(accountId: string): Promise<Money> {
    const balance = await this.getBalance(accountId);
    return balance.availableBalance;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private calculateNewLedgerBalance(
    currentBalance: Money,
    ledgerEntry: LedgerEntry
  ): Money {
    let newAmount: number;

    if (ledgerEntry.entryType === EntryType.CREDIT) {
      newAmount = currentBalance.amount + ledgerEntry.amount.amount;
    } else {
      newAmount = currentBalance.amount - ledgerEntry.amount.amount;
    }

    return {
      amount: this.roundAmount(newAmount),
      currency: currentBalance.currency,
      scale: this.getCurrencyScale(currentBalance.currency)
    };
  }

  private getCurrencyScale(currency: Currency): number {
    return currency === Currency.JPY ? 0 : 2;
  }

  private roundAmount(amount: number): number {
    // Round to 2 decimal places for currency
    return Math.round(amount * 100) / 100;
  }

  private validateLedgerEntry(entry: LedgerEntry): void {
    const errors: string[] = [];

    if (!entry.id || entry.id.trim().length === 0) {
      errors.push('Ledger entry ID is required');
    }

    if (!entry.accountId || entry.accountId.trim().length === 0) {
      errors.push('Account ID is required in ledger entry');
    }

    if (!entry.transactionId || entry.transactionId.trim().length === 0) {
      errors.push('Transaction ID is required in ledger entry');
    }

    if (!entry.entryType) {
      errors.push('Entry type is required');
    }

    try {
      this.validateMoney(entry.amount);
    } catch (error) {
      errors.push((error as Error).message);
    }

    if (entry.amount && entry.amount.amount < 0) {
      errors.push('Ledger entry amount cannot be negative');
    }

    if (entry.amount && entry.amount.amount === 0) {
      errors.push('Ledger entry amount cannot be zero');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid ledger entry', errors);
    }
  }

  private validateMoney(money: Money): void {
    const errors: string[] = [];

    if (!money || typeof money.amount !== 'number') {
      errors.push('Invalid money amount');
    }

    if (!money.currency) {
      errors.push('Invalid money currency');
    }

    if (money && (isNaN(money.amount) || !isFinite(money.amount))) {
      errors.push('Money amount must be a valid number');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid money', errors);
    }
  }
}
