/**
 * Custom Error Types for Banking System
 */

export class BankingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InsufficientFundsError extends BankingError {
  constructor(accountId: string, required: string, available: string) {
    super(
      `Insufficient funds in account ${accountId}. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_FUNDS',
      400
    );
  }
}

export class AccountNotFoundError extends BankingError {
  constructor(accountId: string) {
    super(
      `Account with ID ${accountId} not found`,
      'ACCOUNT_NOT_FOUND',
      404
    );
  }
}

export class AccountInactiveError extends BankingError {
  constructor(accountId: string, status: string) {
    super(
      `Account ${accountId} is ${status} and cannot process transactions`,
      'ACCOUNT_INACTIVE',
      400
    );
  }
}

export class TransactionNotFoundError extends BankingError {
  constructor(transactionId: string) {
    super(
      `Transaction with ID ${transactionId} not found`,
      'TRANSACTION_NOT_FOUND',
      404
    );
  }
}

export class InvalidAmountError extends BankingError {
  constructor(amount: string, reason: string) {
    super(
      `Invalid amount ${amount}: ${reason}`,
      'INVALID_AMOUNT',
      400
    );
  }
}

export class CurrencyMismatchError extends BankingError {
  constructor(currency1: string, currency2: string) {
    super(
      `Currency mismatch: ${currency1} and ${currency2}`,
      'CURRENCY_MISMATCH',
      400
    );
  }
}

export class DailyLimitExceededError extends BankingError {
  constructor(accountId: string, limitType: string, limit: string) {
    super(
      `Daily ${limitType} limit exceeded for account ${accountId}. Limit: ${limit}`,
      'DAILY_LIMIT_EXCEEDED',
      400
    );
  }
}

export class TransactionAlreadyProcessedError extends BankingError {
  constructor(transactionId: string) {
    super(
      `Transaction ${transactionId} has already been processed`,
      'TRANSACTION_ALREADY_PROCESSED',
      400
    );
  }
}

export class TransactionNotReversibleError extends BankingError {
  constructor(transactionId: string, reason: string) {
    super(
      `Transaction ${transactionId} cannot be reversed: ${reason}`,
      'TRANSACTION_NOT_REVERSIBLE',
      400
    );
  }
}

export class InvalidTransactionStateError extends BankingError {
  constructor(transactionId: string, currentState: string, requiredState: string) {
    super(
      `Transaction ${transactionId} is in ${currentState} state, required ${requiredState}`,
      'INVALID_TRANSACTION_STATE',
      400
    );
  }
}

export class ValidationError extends BankingError {
  constructor(message: string, public readonly errors: string[]) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
