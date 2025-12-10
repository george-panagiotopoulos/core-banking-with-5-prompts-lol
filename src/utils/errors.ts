/**
 * Base error class for banking system errors
 */
export abstract class BankingError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Account-related errors
 */
export class AccountNotFoundError extends BankingError {
  constructor(accountId: string) {
    super(`Account not found: ${accountId}`, 'ACCOUNT_NOT_FOUND');
  }
}

export class AccountAlreadyExistsError extends BankingError {
  constructor(accountNumber: string) {
    super(`Account already exists: ${accountNumber}`, 'ACCOUNT_ALREADY_EXISTS');
  }
}

export class AccountClosedError extends BankingError {
  constructor(accountId: string) {
    super(`Account is closed: ${accountId}`, 'ACCOUNT_CLOSED');
  }
}

export class AccountSuspendedError extends BankingError {
  constructor(accountId: string) {
    super(`Account is suspended: ${accountId}`, 'ACCOUNT_SUSPENDED');
  }
}

export class InvalidAccountStatusTransitionError extends BankingError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Invalid status transition from ${currentStatus} to ${targetStatus}`,
      'INVALID_STATUS_TRANSITION'
    );
  }
}

/**
 * Transaction-related errors
 */
export class InsufficientFundsError extends BankingError {
  public readonly availableBalance: number;
  public readonly requestedAmount: number;

  constructor(availableBalance: number, requestedAmount: number) {
    super(
      `Insufficient funds: available ${availableBalance}, requested ${requestedAmount}`,
      'INSUFFICIENT_FUNDS'
    );
    this.availableBalance = availableBalance;
    this.requestedAmount = requestedAmount;
  }
}

export class TransactionNotFoundError extends BankingError {
  constructor(transactionId: string) {
    super(`Transaction not found: ${transactionId}`, 'TRANSACTION_NOT_FOUND');
  }
}

export class DuplicateTransactionError extends BankingError {
  constructor(reference: string) {
    super(`Duplicate transaction reference: ${reference}`, 'DUPLICATE_TRANSACTION');
  }
}

export class TransactionLimitExceededError extends BankingError {
  public readonly limit: number;
  public readonly attempted: number;

  constructor(limit: number, attempted: number, limitType: string) {
    super(
      `${limitType} limit exceeded: limit ${limit}, attempted ${attempted}`,
      'TRANSACTION_LIMIT_EXCEEDED'
    );
    this.limit = limit;
    this.attempted = attempted;
  }
}

export class InvalidTransactionError extends BankingError {
  constructor(reason: string) {
    super(`Invalid transaction: ${reason}`, 'INVALID_TRANSACTION');
  }
}

export class TransactionAlreadyProcessedError extends BankingError {
  constructor(transactionId: string) {
    super(`Transaction already processed: ${transactionId}`, 'TRANSACTION_ALREADY_PROCESSED');
  }
}

export class TransactionReversalNotAllowedError extends BankingError {
  constructor(transactionId: string, reason: string) {
    super(
      `Cannot reverse transaction ${transactionId}: ${reason}`,
      'REVERSAL_NOT_ALLOWED'
    );
  }
}

/**
 * Product-related errors
 */
export class ProductNotFoundError extends BankingError {
  constructor(productId: string) {
    super(`Product not found: ${productId}`, 'PRODUCT_NOT_FOUND');
  }
}

export class ProductInactiveError extends BankingError {
  constructor(productId: string) {
    super(`Product is inactive: ${productId}`, 'PRODUCT_INACTIVE');
  }
}

export class InvalidProductConfigurationError extends BankingError {
  constructor(reason: string) {
    super(`Invalid product configuration: ${reason}`, 'INVALID_PRODUCT_CONFIG');
  }
}

/**
 * Ledger-related errors
 */
export class LedgerImbalanceError extends BankingError {
  public readonly debitTotal: number;
  public readonly creditTotal: number;

  constructor(debitTotal: number, creditTotal: number) {
    super(
      `Ledger imbalance: debits ${debitTotal}, credits ${creditTotal}`,
      'LEDGER_IMBALANCE'
    );
    this.debitTotal = debitTotal;
    this.creditTotal = creditTotal;
  }
}

export class InvalidLedgerEntryError extends BankingError {
  constructor(reason: string) {
    super(`Invalid ledger entry: ${reason}`, 'INVALID_LEDGER_ENTRY');
  }
}

/**
 * Currency-related errors
 */
export class CurrencyMismatchError extends BankingError {
  constructor(expected: string, received: string) {
    super(
      `Currency mismatch: expected ${expected}, received ${received}`,
      'CURRENCY_MISMATCH'
    );
  }
}

export class UnsupportedCurrencyError extends BankingError {
  constructor(currency: string) {
    super(`Unsupported currency: ${currency}`, 'UNSUPPORTED_CURRENCY');
  }
}

/**
 * Validation errors
 */
export class ValidationError extends BankingError {
  public readonly field: string;

  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`, 'VALIDATION_ERROR');
    this.field = field;
  }
}

export class InvalidAmountError extends BankingError {
  constructor(amount: number, reason: string) {
    super(`Invalid amount ${amount}: ${reason}`, 'INVALID_AMOUNT');
  }
}
