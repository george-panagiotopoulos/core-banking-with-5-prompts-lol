/**
 * Transaction Entity with validation and state management
 */

import { Money, TransactionType, TransactionStatus, ValidationResult, Currency } from '../core/domain';
import {
  InvalidAmountError,
  InvalidTransactionStateError,
  TransactionNotReversibleError,
  CurrencyMismatchError
} from '../core/errors';
import { formatMoney } from '../core/money-utils';

export interface TransactionMetadata {
  description?: string;
  reference?: string;
  initiatedBy?: string;
  channel?: string;
  ipAddress?: string;
  deviceId?: string;
  [key: string]: any;
}

export class Transaction {
  private readonly _id: string;
  private readonly _type: TransactionType;
  private readonly _amount: Money;
  private readonly _sourceAccountId?: string;
  private readonly _destinationAccountId?: string;
  private _status: TransactionStatus;
  private readonly _reference: string;
  private readonly _idempotencyKey?: string;
  private readonly _metadata: TransactionMetadata;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _completedAt?: Date;
  private _failureReason?: string;
  private _reversalTransactionId?: string;
  private _originalTransactionId?: string;

  constructor(params: {
    id: string;
    type: TransactionType;
    amount: Money;
    sourceAccountId?: string;
    destinationAccountId?: string;
    status?: TransactionStatus;
    reference: string;
    idempotencyKey?: string;
    metadata?: TransactionMetadata;
    originalTransactionId?: string;
  }) {
    this._id = params.id;
    this._type = params.type;
    this._amount = params.amount;
    this._sourceAccountId = params.sourceAccountId;
    this._destinationAccountId = params.destinationAccountId;
    this._status = params.status || TransactionStatus.PENDING;
    this._reference = params.reference;
    this._idempotencyKey = params.idempotencyKey;
    this._metadata = params.metadata || {};
    this._originalTransactionId = params.originalTransactionId;
    this._createdAt = new Date();
    this._updatedAt = new Date();

    this.validate();
  }

  // Getters
  get id(): string { return this._id; }
  get type(): TransactionType { return this._type; }
  get amount(): Money { return this._amount; }
  get sourceAccountId(): string | undefined { return this._sourceAccountId; }
  get destinationAccountId(): string | undefined { return this._destinationAccountId; }
  get status(): TransactionStatus { return this._status; }
  get reference(): string { return this._reference; }
  get idempotencyKey(): string | undefined { return this._idempotencyKey; }
  get metadata(): TransactionMetadata { return { ...this._metadata }; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }
  get completedAt(): Date | undefined { return this._completedAt; }
  get failureReason(): string | undefined { return this._failureReason; }
  get reversalTransactionId(): string | undefined { return this._reversalTransactionId; }
  get originalTransactionId(): string | undefined { return this._originalTransactionId; }

  /**
   * Validate transaction data
   */
  private validate(): void {
    const errors: string[] = [];

    // Validate amount
    if (this._amount.amount <= 0) {
      errors.push('Transaction amount must be greater than zero');
    }

    // Validate account IDs based on transaction type
    if (this._type === TransactionType.TRANSFER) {
      if (!this._sourceAccountId || !this._destinationAccountId) {
        errors.push('Transfer transactions require both source and destination accounts');
      }
      if (this._sourceAccountId === this._destinationAccountId) {
        errors.push('Source and destination accounts cannot be the same');
      }
    } else if (this._type === TransactionType.WITHDRAWAL || this._type === TransactionType.PAYMENT) {
      if (!this._sourceAccountId) {
        errors.push(`${this._type} transactions require a source account`);
      }
    } else if (this._type === TransactionType.DEPOSIT) {
      if (!this._destinationAccountId) {
        errors.push('Deposit transactions require a destination account');
      }
    } else if (this._type === TransactionType.REVERSAL) {
      if (!this._originalTransactionId) {
        errors.push('Reversal transactions require an original transaction ID');
      }
    }

    // Validate reference
    if (!this._reference || this._reference.trim().length === 0) {
      errors.push('Transaction reference is required');
    }

    if (errors.length > 0) {
      throw new InvalidAmountError(
        formatMoney(this._amount),
        errors.join('; ')
      );
    }
  }

  /**
   * Validate amount is positive and within reasonable limits
   */
  validateAmount(): ValidationResult {
    const errors: string[] = [];

    if (this._amount.amount <= 0) {
      errors.push('Amount must be greater than zero');
    }

    // Maximum transaction amount check (e.g., 1 million)
    const maxAmount = 1000000;
    if (this._amount.amount > maxAmount) {
      errors.push(`Amount exceeds maximum allowed: ${this._amount.currency} ${maxAmount}`);
    }

    // Check for decimal precision (max 2 decimal places)
    const decimalPlaces = (this._amount.amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push('Amount cannot have more than 2 decimal places');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate currency matches expected currency
   */
  validateCurrency(expectedCurrency: Currency): ValidationResult {
    const errors: string[] = [];

    if (this._amount.currency !== expectedCurrency) {
      errors.push(`Currency mismatch: expected ${expectedCurrency}, got ${this._amount.currency}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if status transition is valid
   */
  private isValidStatusTransition(newStatus: TransactionStatus): boolean {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.PENDING]: [TransactionStatus.PROCESSING, TransactionStatus.FAILED, TransactionStatus.REJECTED],
      [TransactionStatus.PROCESSING]: [TransactionStatus.COMPLETED, TransactionStatus.FAILED, TransactionStatus.ON_HOLD],
      [TransactionStatus.COMPLETED]: [TransactionStatus.REVERSED],
      [TransactionStatus.FAILED]: [],
      [TransactionStatus.REVERSED]: [],
      [TransactionStatus.REJECTED]: [],
      [TransactionStatus.ON_HOLD]: [TransactionStatus.PROCESSING, TransactionStatus.REJECTED]
    };

    const allowedTransitions = validTransitions[this._status];
    return allowedTransitions !== undefined && allowedTransitions.includes(newStatus);
  }

  /**
   * Transition to PROCESSING state
   */
  markAsProcessing(): void {
    if (!this.isValidStatusTransition(TransactionStatus.PROCESSING)) {
      throw new InvalidTransactionStateError(
        this._id,
        this._status,
        TransactionStatus.PROCESSING
      );
    }
    this._status = TransactionStatus.PROCESSING;
    this._updatedAt = new Date();
  }

  /**
   * Transition to COMPLETED state
   */
  markAsCompleted(): void {
    if (!this.isValidStatusTransition(TransactionStatus.COMPLETED)) {
      throw new InvalidTransactionStateError(
        this._id,
        this._status,
        TransactionStatus.COMPLETED
      );
    }
    this._status = TransactionStatus.COMPLETED;
    this._completedAt = new Date();
    this._updatedAt = new Date();
  }

  /**
   * Transition to FAILED state
   */
  markAsFailed(reason: string): void {
    if (!this.isValidStatusTransition(TransactionStatus.FAILED)) {
      throw new InvalidTransactionStateError(
        this._id,
        this._status,
        TransactionStatus.FAILED
      );
    }
    this._status = TransactionStatus.FAILED;
    this._failureReason = reason;
    this._updatedAt = new Date();
  }

  /**
   * Transition to REVERSED state
   */
  markAsReversed(reversalTransactionId: string): void {
    if (!this.isValidStatusTransition(TransactionStatus.REVERSED)) {
      throw new InvalidTransactionStateError(
        this._id,
        this._status,
        TransactionStatus.REVERSED
      );
    }
    this._status = TransactionStatus.REVERSED;
    this._reversalTransactionId = reversalTransactionId;
    this._updatedAt = new Date();
  }

  /**
   * Check if transaction can be reversed
   */
  isReversible(): boolean {
    // Only completed transactions can be reversed
    if (this._status !== TransactionStatus.COMPLETED) {
      return false;
    }

    // Already reversed transactions cannot be reversed again
    if (this._reversalTransactionId) {
      return false;
    }

    // Reversal transactions themselves cannot be reversed
    if (this._type === TransactionType.REVERSAL) {
      return false;
    }

    // Check time window (e.g., can only reverse within 90 days)
    if (this._completedAt) {
      const daysSinceCompletion = (Date.now() - this._completedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCompletion > 90) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get reason why transaction cannot be reversed
   */
  getReversalBlockReason(): string | null {
    if (this._status !== TransactionStatus.COMPLETED) {
      return `Transaction is not completed (current status: ${this._status})`;
    }

    if (this._reversalTransactionId) {
      return `Transaction has already been reversed (reversal ID: ${this._reversalTransactionId})`;
    }

    if (this._type === TransactionType.REVERSAL) {
      return 'Reversal transactions cannot be reversed';
    }

    if (this._completedAt) {
      const daysSinceCompletion = (Date.now() - this._completedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCompletion > 90) {
        return `Transaction is too old to reverse (${Math.floor(daysSinceCompletion)} days ago, limit is 90 days)`;
      }
    }

    return null;
  }

  /**
   * Check if transaction is in a final state
   */
  isFinal(): boolean {
    return [
      TransactionStatus.COMPLETED,
      TransactionStatus.FAILED,
      TransactionStatus.REVERSED
    ].includes(this._status);
  }

  /**
   * Check if transaction is pending or processing
   */
  isInProgress(): boolean {
    return [
      TransactionStatus.PENDING,
      TransactionStatus.PROCESSING
    ].includes(this._status);
  }

  /**
   * Convert to plain object for persistence
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      type: this._type,
      amount: {
        amount: this._amount.amount,
        currency: this._amount.currency
      },
      sourceAccountId: this._sourceAccountId,
      destinationAccountId: this._destinationAccountId,
      status: this._status,
      reference: this._reference,
      idempotencyKey: this._idempotencyKey,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      completedAt: this._completedAt,
      failureReason: this._failureReason,
      reversalTransactionId: this._reversalTransactionId,
      originalTransactionId: this._originalTransactionId
    };
  }

  /**
   * Create transaction from plain object
   */
  static fromObject(obj: Record<string, any>): Transaction {
    const amount: Money = {
      amount: obj.amount.amount,
      currency: obj.amount.currency,
      scale: obj.amount.scale || 2
    };

    const transaction = new Transaction({
      id: obj.id,
      type: obj.type,
      amount,
      sourceAccountId: obj.sourceAccountId,
      destinationAccountId: obj.destinationAccountId,
      status: obj.status,
      reference: obj.reference,
      idempotencyKey: obj.idempotencyKey,
      metadata: obj.metadata,
      originalTransactionId: obj.originalTransactionId
    });

    // Restore internal state
    (transaction as any)._createdAt = new Date(obj.createdAt);
    (transaction as any)._updatedAt = new Date(obj.updatedAt);
    if (obj.completedAt) {
      (transaction as any)._completedAt = new Date(obj.completedAt);
    }
    if (obj.failureReason) {
      (transaction as any)._failureReason = obj.failureReason;
    }
    if (obj.reversalTransactionId) {
      (transaction as any)._reversalTransactionId = obj.reversalTransactionId;
    }

    return transaction;
  }
}
