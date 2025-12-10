/**
 * Account Entity
 * Represents a banking account with all its properties and behaviors
 */

import {
  AccountStatus,
  Currency,
  Money,
  AccountNumber,
  CustomerId
} from '../core/domain';
import { ValidationError, AccountInactiveError } from '../core/errors';

export interface AccountDetails {
  nickname?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AccountProps {
  id: string;
  accountNumber: AccountNumber;
  customerId: CustomerId;
  productId: string;
  status: AccountStatus;
  currency: Currency;
  ledgerBalance: Money;
  availableBalance: Money;
  holdAmount: Money;
  overdraftLimit?: Money;
  details?: AccountDetails;
  openedAt: Date;
  closedAt?: Date;
  closedReason?: string;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export class Account {
  private props: AccountProps;

  constructor(props: AccountProps) {
    this.validateProps(props);
    this.props = { ...props };
  }

  // ============================================================================
  // Getters
  // ============================================================================

  get id(): string {
    return this.props.id;
  }

  get accountNumber(): AccountNumber {
    return this.props.accountNumber;
  }

  get customerId(): CustomerId {
    return this.props.customerId;
  }

  get productId(): string {
    return this.props.productId;
  }

  get status(): AccountStatus {
    return this.props.status;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  get version(): number {
    return this.props.version;
  }

  get details(): AccountDetails | undefined {
    return this.props.details;
  }

  get openedAt(): Date {
    return this.props.openedAt;
  }

  get closedAt(): Date | undefined {
    return this.props.closedAt;
  }

  get closedReason(): string | undefined {
    return this.props.closedReason;
  }

  get lastActivityAt(): Date {
    return this.props.lastActivityAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  // ============================================================================
  // Balance Getters
  // ============================================================================

  getAvailableBalance(): Money {
    return { ...this.props.availableBalance };
  }

  getLedgerBalance(): Money {
    return { ...this.props.ledgerBalance };
  }

  getHoldAmount(): Money {
    return { ...this.props.holdAmount };
  }

  // ============================================================================
  // Account Lifecycle Methods
  // ============================================================================

  /**
   * Activates a pending account
   */
  activate(): void {
    if (this.props.status !== AccountStatus.PENDING) {
      throw new AccountInactiveError(this.props.id, this.props.status);
    }

    this.props.status = AccountStatus.ACTIVE;
    this.props.updatedAt = new Date();
    this.props.version++;
  }

  /**
   * Suspends an active account
   */
  suspend(reason?: string): void {
    if (this.props.status !== AccountStatus.ACTIVE) {
      throw new AccountInactiveError(this.props.id, this.props.status);
    }

    this.props.status = AccountStatus.SUSPENDED;
    if (reason) {
      this.props.details = this.props.details || {};
      this.props.details.metadata = {
        ...this.props.details.metadata,
        suspendReason: reason,
        suspendedAt: new Date().toISOString()
      };
    }
    this.props.updatedAt = new Date();
    this.props.version++;
  }

  /**
   * Closes an account
   */
  close(reason: string): void {
    if (this.props.status === AccountStatus.CLOSED) {
      throw new AccountInactiveError(this.props.id, this.props.status);
    }

    // Verify account can be closed (balance should be zero)
    if (this.props.ledgerBalance.amount !== 0) {
      throw new ValidationError(
        'Cannot close account with non-zero balance',
        [`Account ID: ${this.props.id}`, `Balance: ${this.props.ledgerBalance.amount}`]
      );
    }

    this.props.status = AccountStatus.CLOSED;
    this.props.closedAt = new Date();
    this.props.closedReason = reason;
    this.props.updatedAt = new Date();
    this.props.version++;
  }

  /**
   * Reactivates a suspended account
   */
  reactivate(): void {
    if (this.props.status !== AccountStatus.SUSPENDED) {
      throw new AccountInactiveError(this.props.id, this.props.status);
    }

    this.props.status = AccountStatus.ACTIVE;
    if (this.props.details?.metadata) {
      delete this.props.details.metadata.suspendReason;
      delete this.props.details.metadata.suspendedAt;
    }
    this.props.updatedAt = new Date();
    this.props.version++;
  }

  // ============================================================================
  // Account Details Management
  // ============================================================================

  /**
   * Updates account details
   */
  updateDetails(details: Partial<AccountDetails>): void {
    this.ensureNotClosed();

    this.props.details = {
      ...this.props.details,
      ...details
    };
    this.props.updatedAt = new Date();
    this.props.version++;
  }

  /**
   * Updates last activity timestamp
   */
  recordActivity(): void {
    this.props.lastActivityAt = new Date();
    this.props.updatedAt = new Date();
  }

  // ============================================================================
  // Balance Update Methods (internal use by BalanceService)
  // ============================================================================

  updateBalances(ledgerBalance: Money, availableBalance: Money, holdAmount: Money): void {
    this.validateMoney(ledgerBalance);
    this.validateMoney(availableBalance);
    this.validateMoney(holdAmount);

    this.props.ledgerBalance = { ...ledgerBalance };
    this.props.availableBalance = { ...availableBalance };
    this.props.holdAmount = { ...holdAmount };
    this.props.updatedAt = new Date();
    this.props.version++;
  }

  // ============================================================================
  // Status Validation Methods
  // ============================================================================

  isActive(): boolean {
    return this.props.status === AccountStatus.ACTIVE;
  }

  isSuspended(): boolean {
    return this.props.status === AccountStatus.SUSPENDED;
  }

  isClosed(): boolean {
    return this.props.status === AccountStatus.CLOSED;
  }

  isPending(): boolean {
    return this.props.status === AccountStatus.PENDING;
  }

  isDormant(): boolean {
    return this.props.status === AccountStatus.DORMANT;
  }

  canTransact(): boolean {
    return this.props.status === AccountStatus.ACTIVE;
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  private validateProps(props: AccountProps): void {
    const errors: string[] = [];

    if (!props.id || props.id.trim().length === 0) {
      errors.push('Account ID is required');
    }

    if (!props.accountNumber || !props.accountNumber.value) {
      errors.push('Account number is required');
    }

    if (!props.customerId || !props.customerId.value) {
      errors.push('Customer ID is required');
    }

    if (!props.productId || props.productId.trim().length === 0) {
      errors.push('Product ID is required');
    }

    if (!props.currency) {
      errors.push('Currency is required');
    }

    try {
      this.validateMoney(props.ledgerBalance);
      this.validateMoney(props.availableBalance);
      this.validateMoney(props.holdAmount);
    } catch (error) {
      errors.push((error as Error).message);
    }

    if (props.ledgerBalance && props.ledgerBalance.currency !== props.currency) {
      errors.push('Ledger balance currency must match account currency');
    }

    if (props.availableBalance && props.availableBalance.currency !== props.currency) {
      errors.push('Available balance currency must match account currency');
    }

    if (props.holdAmount && props.holdAmount.currency !== props.currency) {
      errors.push('Hold amount currency must match account currency');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid account properties', errors);
    }
  }

  private validateMoney(money: Money): void {
    if (!money || typeof money.amount !== 'number') {
      throw new ValidationError('Invalid money amount', ['Amount must be a number']);
    }

    if (!money.currency) {
      throw new ValidationError('Invalid money currency', ['Currency is required']);
    }

    if (isNaN(money.amount) || !isFinite(money.amount)) {
      throw new ValidationError('Money amount must be a valid number', ['Amount must be finite']);
    }
  }

  private ensureNotClosed(): void {
    if (this.props.status === AccountStatus.CLOSED) {
      throw new AccountInactiveError(this.props.id, this.props.status);
    }
  }

  // ============================================================================
  // Serialization
  // ============================================================================

  toJSON(): AccountProps {
    return { ...this.props };
  }

  static fromJSON(data: any): Account {
    const props: AccountProps = {
      ...data,
      openedAt: new Date(data.openedAt),
      closedAt: data.closedAt ? new Date(data.closedAt) : undefined,
      lastActivityAt: new Date(data.lastActivityAt),
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    };
    return new Account(props);
  }
}
