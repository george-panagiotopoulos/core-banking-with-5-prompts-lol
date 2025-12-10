/**
 * Transaction Module Exports
 */

export { Transaction, TransactionMetadata } from './transaction';
export { TransactionProcessor, TransactionRepository, LedgerService, TransactionProcessorOptions } from './transaction-processor';
export { TransactionValidator, AccountRepository } from './transaction-validator';

// Re-export domain types for convenience
export {
  Money,
  TransactionType,
  TransactionStatus,
  ValidationResult,
  Account,
  AccountType,
  AccountStatus
} from '../core/domain';

// Re-export errors for convenience
export {
  BankingError,
  InsufficientFundsError,
  AccountNotFoundError,
  AccountInactiveError,
  TransactionNotFoundError,
  InvalidAmountError,
  CurrencyMismatchError,
  DailyLimitExceededError,
  TransactionAlreadyProcessedError,
  TransactionNotReversibleError,
  InvalidTransactionStateError,
  ValidationError
} from '../core/errors';
