/**
 * Account Service
 * Business logic for account management operations
 */

import { Account, AccountProps, AccountDetails } from './account';
import { AccountNumberGenerator } from './account-number-generator';
import {
  AccountStatus,
  Currency,
  Money,
  AccountNumber,
  CustomerId
} from '../core/domain';
import {
  ValidationError,
  AccountNotFoundError,
  AccountInactiveError
} from '../core/errors';
import { v4 as uuidv4 } from 'uuid';

export interface CreateAccountParams {
  customerId: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS' | 'JOINT';
  productId: string;
  currency: Currency;
  initialDeposit?: Money;
  branchCode?: string;
  overdraftLimit?: Money;
  details?: AccountDetails;
}

export interface AccountRepository {
  save(account: Account): Promise<void>;
  findById(accountId: string): Promise<Account | null>;
  findByAccountNumber(accountNumber: string): Promise<Account | null>;
  findByCustomerId(customerId: string): Promise<Account[]>;
  update(account: Account): Promise<void>;
  delete(accountId: string): Promise<void>;
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

export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly accountNumberGenerator: AccountNumberGenerator,
    private readonly auditLogger: AuditLogger
  ) {}

  /**
   * Creates a new account
   */
  async createAccount(params: CreateAccountParams): Promise<Account> {
    // Validate parameters
    this.validateCreateParams(params);

    // Generate unique account number
    const accountNumberValue = this.accountNumberGenerator.generate(params.branchCode);
    const accountNumber: AccountNumber = this.parseAccountNumber(accountNumberValue);

    // Create customer ID
    const customerId: CustomerId = {
      value: params.customerId,
      type: params.customerType
    };

    // Create account entity
    const now = new Date();
    const accountProps: AccountProps = {
      id: uuidv4(),
      accountNumber,
      customerId,
      productId: params.productId,
      status: AccountStatus.PENDING,
      currency: params.currency,
      ledgerBalance: {
        amount: params.initialDeposit?.amount || 0,
        currency: params.currency,
        scale: this.getCurrencyScale(params.currency)
      },
      availableBalance: {
        amount: params.initialDeposit?.amount || 0,
        currency: params.currency,
        scale: this.getCurrencyScale(params.currency)
      },
      holdAmount: {
        amount: 0,
        currency: params.currency,
        scale: this.getCurrencyScale(params.currency)
      },
      overdraftLimit: params.overdraftLimit || undefined,
      details: params.details,
      openedAt: now,
      lastActivityAt: now,
      createdAt: now,
      updatedAt: now,
      version: 1
    };

    const account = new Account(accountProps);

    // Persist account
    await this.repository.save(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Account',
      entityId: account.id,
      action: 'CREATE',
      actor: 'system',
      metadata: {
        accountNumber: account.accountNumber.value,
        customerId: params.customerId,
        productId: params.productId
      }
    });

    return account;
  }

  /**
   * Retrieves an account by ID
   */
  async getAccount(accountId: string): Promise<Account> {
    if (!accountId || accountId.trim().length === 0) {
      throw new ValidationError('Account ID is required', ['accountId']);
    }

    const account = await this.repository.findById(accountId);

    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    return account;
  }

  /**
   * Retrieves an account by account number
   */
  async getAccountByNumber(accountNumber: string): Promise<Account> {
    if (!accountNumber || accountNumber.trim().length === 0) {
      throw new ValidationError('Account number is required', ['accountNumber']);
    }

    // Validate account number format
    if (!this.accountNumberGenerator.validate(accountNumber)) {
      throw new ValidationError('Invalid account number format', [accountNumber]);
    }

    const account = await this.repository.findByAccountNumber(accountNumber);

    if (!account) {
      throw new AccountNotFoundError(accountNumber);
    }

    return account;
  }

  /**
   * Updates account status
   */
  async updateAccountStatus(
    accountId: string,
    status: AccountStatus,
    reason?: string
  ): Promise<Account> {
    const account = await this.getAccount(accountId);
    const previousStatus = account.status;

    // Apply status change based on transition
    switch (status) {
      case AccountStatus.ACTIVE:
        if (account.isPending()) {
          account.activate();
        } else if (account.isSuspended()) {
          account.reactivate();
        } else {
          throw new AccountInactiveError(accountId, previousStatus);
        }
        break;

      case AccountStatus.SUSPENDED:
        account.suspend(reason);
        break;

      case AccountStatus.CLOSED:
        if (!reason) {
          throw new ValidationError('Reason is required when closing account', ['reason']);
        }
        account.close(reason);
        break;

      default:
        throw new ValidationError(
          `Invalid status transition: ${previousStatus} -> ${status}`,
          ['status']
        );
    }

    // Update account
    await this.repository.update(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Account',
      entityId: account.id,
      action: 'UPDATE_STATUS',
      actor: 'system',
      changes: {
        previousStatus,
        newStatus: status,
        reason
      }
    });

    return account;
  }

  /**
   * Retrieves all accounts for a customer
   */
  async getAccountsByCustomer(customerId: string): Promise<Account[]> {
    if (!customerId || customerId.trim().length === 0) {
      throw new ValidationError('Customer ID is required', ['customerId']);
    }

    const accounts = await this.repository.findByCustomerId(customerId);
    return accounts;
  }

  /**
   * Closes an account
   */
  async closeAccount(accountId: string, reason: string): Promise<Account> {
    if (!reason || reason.trim().length === 0) {
      throw new ValidationError('Reason is required to close account', ['reason']);
    }

    const account = await this.getAccount(accountId);

    // Verify account can be closed
    if (account.isClosed()) {
      throw new AccountInactiveError(accountId, AccountStatus.CLOSED);
    }

    const ledgerBalance = account.getLedgerBalance();
    if (ledgerBalance.amount !== 0) {
      throw new ValidationError(
        'Cannot close account with non-zero balance. Please transfer remaining funds first.',
        [`Account ID: ${accountId}`, `Balance: ${ledgerBalance.amount}`]
      );
    }

    const holdAmount = account.getHoldAmount();
    if (holdAmount.amount !== 0) {
      throw new ValidationError(
        'Cannot close account with pending holds. Please wait for holds to clear.',
        [`Account ID: ${accountId}`, `Hold Amount: ${holdAmount.amount}`]
      );
    }

    // Close account
    account.close(reason);
    await this.repository.update(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Account',
      entityId: account.id,
      action: 'CLOSE',
      actor: 'system',
      metadata: {
        reason,
        accountNumber: account.accountNumber.value
      }
    });

    return account;
  }

  /**
   * Updates account details
   */
  async updateAccountDetails(
    accountId: string,
    details: AccountDetails
  ): Promise<Account> {
    const account = await this.getAccount(accountId);

    const previousDetails = account.details;
    account.updateDetails(details);

    await this.repository.update(account);

    // Audit log
    await this.auditLogger.log({
      entityType: 'Account',
      entityId: account.id,
      action: 'UPDATE_DETAILS',
      actor: 'system',
      changes: {
        previous: previousDetails,
        current: details
      }
    });

    return account;
  }

  /**
   * Activates a pending account
   */
  async activateAccount(accountId: string): Promise<Account> {
    return this.updateAccountStatus(accountId, AccountStatus.ACTIVE);
  }

  /**
   * Suspends an active account
   */
  async suspendAccount(accountId: string, reason: string): Promise<Account> {
    return this.updateAccountStatus(accountId, AccountStatus.SUSPENDED, reason);
  }

  /**
   * Reactivates a suspended account
   */
  async reactivateAccount(accountId: string): Promise<Account> {
    const account = await this.getAccount(accountId);

    if (!account.isSuspended()) {
      throw new AccountInactiveError(accountId, account.status);
    }

    return this.updateAccountStatus(accountId, AccountStatus.ACTIVE);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateCreateParams(params: CreateAccountParams): void {
    const errors: string[] = [];

    if (!params.customerId || params.customerId.trim().length === 0) {
      errors.push('Customer ID is required');
    }

    if (!params.customerType) {
      errors.push('Customer type is required');
    }

    if (!params.productId || params.productId.trim().length === 0) {
      errors.push('Product ID is required');
    }

    if (!params.currency) {
      errors.push('Currency is required');
    }

    if (params.initialDeposit) {
      if (params.initialDeposit.currency !== params.currency) {
        errors.push('Initial deposit currency must match account currency');
      }

      if (params.initialDeposit.amount < 0) {
        errors.push('Initial deposit amount cannot be negative');
      }
    }

    if (params.branchCode && !/^\d{2}$/.test(params.branchCode)) {
      errors.push('Branch code must be 2 digits');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid create account parameters', errors);
    }
  }

  private parseAccountNumber(accountNumberValue: string): AccountNumber {
    const cleaned = accountNumberValue.replace(/[-\s]/g, '');

    return {
      value: cleaned,
      bankCode: cleaned.substring(0, 2),
      branchCode: cleaned.substring(2, 8),
      accountSequence: cleaned.substring(8, 16),
      checkDigit: cleaned.substring(16, 18) || '00'
    };
  }

  private getCurrencyScale(currency: Currency): number {
    // Most currencies use 2 decimal places, JPY uses 0
    return currency === Currency.JPY ? 0 : 2;
  }
}
