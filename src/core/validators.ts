/**
 * Core Banking System - Validation Rules Engine
 *
 * Centralized validation logic for all banking operations
 */

import {
  Account,
  AccountStatus,
  Transaction,
  TransactionType,
  TransactionStatus,
  ProductConfiguration,
  Money,
  Currency,
  Balance,
} from './domain';
import {
  ValidationError,
  InvalidAmountError,
  AccountClosedError,
  AccountSuspendedError,
  InsufficientFundsError,
  CurrencyMismatchError,
  TransactionLimitExceededError,
} from '../utils/errors';

/**
 * Validation result with optional error details
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Create a successful validation result
 */
export function validResult(): ValidationResult {
  return { isValid: true, errors: [] };
}

/**
 * Create a failed validation result
 */
export function invalidResult(...errors: ValidationError[]): ValidationResult {
  return { isValid: false, errors };
}

/**
 * Account validator
 */
export class AccountValidator {
  /**
   * Validate account can receive transactions
   */
  static canReceiveTransaction(account: Account): ValidationResult {
    const errors: ValidationError[] = [];

    if (account.status === AccountStatus.CLOSED) {
      errors.push(new ValidationError('status', 'Account is closed'));
    }

    if (account.status === AccountStatus.FROZEN) {
      errors.push(new ValidationError('status', 'Account is frozen'));
    }

    if (account.status === AccountStatus.SUSPENDED) {
      errors.push(new ValidationError('status', 'Account is suspended'));
    }

    if (account.status === AccountStatus.PENDING) {
      errors.push(new ValidationError('status', 'Account is not yet active'));
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate account can send transactions
   */
  static canSendTransaction(account: Account): ValidationResult {
    const errors: ValidationError[] = [];

    if (account.status !== AccountStatus.ACTIVE) {
      errors.push(new ValidationError('status', `Account status ${account.status} does not allow outgoing transactions`));
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate account status transition
   */
  static canTransitionTo(account: Account, targetStatus: AccountStatus): ValidationResult {
    const allowedTransitions: Record<AccountStatus, AccountStatus[]> = {
      [AccountStatus.PENDING]: [AccountStatus.ACTIVE, AccountStatus.CLOSED],
      [AccountStatus.ACTIVE]: [AccountStatus.SUSPENDED, AccountStatus.FROZEN, AccountStatus.DORMANT, AccountStatus.CLOSED],
      [AccountStatus.SUSPENDED]: [AccountStatus.ACTIVE, AccountStatus.CLOSED],
      [AccountStatus.FROZEN]: [AccountStatus.ACTIVE, AccountStatus.CLOSED],
      [AccountStatus.DORMANT]: [AccountStatus.ACTIVE, AccountStatus.CLOSED],
      [AccountStatus.CLOSED]: [], // No transitions from closed
    };

    const allowed = allowedTransitions[account.status] || [];

    if (!allowed.includes(targetStatus)) {
      return invalidResult(
        new ValidationError('status', `Cannot transition from ${account.status} to ${targetStatus}`)
      );
    }

    return validResult();
  }

  /**
   * Validate account closure requirements
   */
  static canClose(account: Account, balance: Balance): ValidationResult {
    const errors: ValidationError[] = [];

    if (account.status === AccountStatus.CLOSED) {
      errors.push(new ValidationError('status', 'Account is already closed'));
    }

    // Balance must be zero to close
    if (balance.ledgerBalance.amount !== 0) {
      errors.push(new ValidationError('balance', 'Account balance must be zero before closing'));
    }

    // No pending transactions
    if (balance.pendingBalance.amount !== 0) {
      errors.push(new ValidationError('pendingBalance', 'Account has pending transactions'));
    }

    // No held funds
    if (balance.heldBalance.amount !== 0) {
      errors.push(new ValidationError('heldBalance', 'Account has held funds'));
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }
}

/**
 * Transaction validator
 */
export class TransactionValidator {
  /**
   * Validate transaction amount
   */
  static validateAmount(amount: Money): ValidationResult {
    const errors: ValidationError[] = [];

    if (amount.amount <= 0) {
      errors.push(new ValidationError('amount', 'Amount must be greater than zero'));
    }

    if (!Number.isFinite(amount.amount)) {
      errors.push(new ValidationError('amount', 'Amount must be a finite number'));
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate currency match between transaction and account
   */
  static validateCurrency(transactionCurrency: Currency, accountCurrency: Currency): ValidationResult {
    if (transactionCurrency !== accountCurrency) {
      return invalidResult(
        new ValidationError('currency', `Currency mismatch: transaction ${transactionCurrency}, account ${accountCurrency}`)
      );
    }
    return validResult();
  }

  /**
   * Validate sufficient funds for transaction
   */
  static validateSufficientFunds(
    availableBalance: Money,
    amount: Money,
    overdraftLimit?: Money | null
  ): ValidationResult {
    let effectiveLimit = availableBalance.amount;

    if (overdraftLimit) {
      effectiveLimit += overdraftLimit.amount;
    }

    if (amount.amount > effectiveLimit) {
      return invalidResult(
        new ValidationError('amount', `Insufficient funds: available ${effectiveLimit}, requested ${amount.amount}`)
      );
    }

    return validResult();
  }

  /**
   * Validate transaction against product limits
   */
  static validateAgainstLimits(
    amount: Money,
    product: ProductConfiguration,
    dailyTotal: Money
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check single transaction limit
    if (amount.amount > product.limits.maxTransactionAmount.amount) {
      errors.push(
        new ValidationError(
          'amount',
          `Exceeds maximum transaction amount of ${product.limits.maxTransactionAmount.amount}`
        )
      );
    }

    // Check daily limit
    const newDailyTotal = dailyTotal.amount + amount.amount;
    if (newDailyTotal > product.limits.maxDailyAmount.amount) {
      errors.push(
        new ValidationError(
          'dailyLimit',
          `Exceeds daily limit of ${product.limits.maxDailyAmount.amount}`
        )
      );
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate transfer transaction
   */
  static validateTransfer(
    sourceAccount: Account,
    destinationAccount: Account,
    amount: Money,
    sourceBalance: Balance
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate source account can send
    const sourceResult = AccountValidator.canSendTransaction(sourceAccount);
    if (!sourceResult.isValid) {
      errors.push(...sourceResult.errors);
    }

    // Validate destination account can receive
    const destResult = AccountValidator.canReceiveTransaction(destinationAccount);
    if (!destResult.isValid) {
      errors.push(...destResult.errors);
    }

    // Validate amount
    const amountResult = this.validateAmount(amount);
    if (!amountResult.isValid) {
      errors.push(...amountResult.errors);
    }

    // Validate currency match
    if (sourceAccount.currency !== amount.currency) {
      errors.push(new ValidationError('currency', 'Transaction currency does not match source account'));
    }

    if (destinationAccount.currency !== amount.currency) {
      errors.push(new ValidationError('currency', 'Transaction currency does not match destination account'));
    }

    // Validate sufficient funds
    const fundsResult = this.validateSufficientFunds(
      sourceBalance.availableBalance,
      amount,
      sourceAccount.overdraftLimit
    );
    if (!fundsResult.isValid) {
      errors.push(...fundsResult.errors);
    }

    // Cannot transfer to same account
    if (sourceAccount.id === destinationAccount.id) {
      errors.push(new ValidationError('accounts', 'Cannot transfer to the same account'));
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate deposit transaction
   */
  static validateDeposit(account: Account, amount: Money): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate account can receive
    const accountResult = AccountValidator.canReceiveTransaction(account);
    if (!accountResult.isValid) {
      errors.push(...accountResult.errors);
    }

    // Validate amount
    const amountResult = this.validateAmount(amount);
    if (!amountResult.isValid) {
      errors.push(...amountResult.errors);
    }

    // Validate currency match
    const currencyResult = this.validateCurrency(amount.currency, account.currency);
    if (!currencyResult.isValid) {
      errors.push(...currencyResult.errors);
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate withdrawal transaction
   */
  static validateWithdrawal(
    account: Account,
    amount: Money,
    balance: Balance
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate account can send
    const accountResult = AccountValidator.canSendTransaction(account);
    if (!accountResult.isValid) {
      errors.push(...accountResult.errors);
    }

    // Validate amount
    const amountResult = this.validateAmount(amount);
    if (!amountResult.isValid) {
      errors.push(...amountResult.errors);
    }

    // Validate currency match
    const currencyResult = this.validateCurrency(amount.currency, account.currency);
    if (!currencyResult.isValid) {
      errors.push(...currencyResult.errors);
    }

    // Validate sufficient funds
    const fundsResult = this.validateSufficientFunds(
      balance.availableBalance,
      amount,
      account.overdraftLimit
    );
    if (!fundsResult.isValid) {
      errors.push(...fundsResult.errors);
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate transaction status transition
   */
  static canTransitionTo(
    currentStatus: TransactionStatus,
    targetStatus: TransactionStatus
  ): ValidationResult {
    const allowedTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatus.PENDING]: [
        TransactionStatus.PROCESSING,
        TransactionStatus.REJECTED,
        TransactionStatus.ON_HOLD,
      ],
      [TransactionStatus.PROCESSING]: [
        TransactionStatus.COMPLETED,
        TransactionStatus.FAILED,
        TransactionStatus.ON_HOLD,
      ],
      [TransactionStatus.COMPLETED]: [TransactionStatus.REVERSED],
      [TransactionStatus.FAILED]: [], // Terminal state
      [TransactionStatus.REVERSED]: [], // Terminal state
      [TransactionStatus.REJECTED]: [], // Terminal state
      [TransactionStatus.ON_HOLD]: [
        TransactionStatus.PROCESSING,
        TransactionStatus.REJECTED,
      ],
    };

    const allowed = allowedTransitions[currentStatus] || [];

    if (!allowed.includes(targetStatus)) {
      return invalidResult(
        new ValidationError('status', `Cannot transition from ${currentStatus} to ${targetStatus}`)
      );
    }

    return validResult();
  }

  /**
   * Validate reversal is allowed
   */
  static canReverse(transaction: Transaction): ValidationResult {
    const errors: ValidationError[] = [];

    if (transaction.status !== TransactionStatus.COMPLETED) {
      errors.push(new ValidationError('status', 'Only completed transactions can be reversed'));
    }

    // Check if already reversed
    if (transaction.originalTransactionId) {
      errors.push(new ValidationError('type', 'Reversal transactions cannot be reversed'));
    }

    // Check reversal window (e.g., 30 days)
    const reversalWindowDays = 30;
    const completedAt = transaction.completedAt;
    if (completedAt) {
      const daysSinceCompletion = Math.floor(
        (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceCompletion > reversalWindowDays) {
        errors.push(
          new ValidationError('time', `Reversal window of ${reversalWindowDays} days has expired`)
        );
      }
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }
}

/**
 * Product validator
 */
export class ProductValidator {
  /**
   * Validate product configuration
   */
  static validateConfiguration(config: Partial<ProductConfiguration>): ValidationResult {
    const errors: ValidationError[] = [];

    if (config.name && config.name.trim().length < 3) {
      errors.push(new ValidationError('name', 'Product name must be at least 3 characters'));
    }

    if (config.interestRate !== undefined) {
      if (config.interestRate < 0 || config.interestRate > 1) {
        errors.push(new ValidationError('interestRate', 'Interest rate must be between 0 and 1'));
      }
    }

    if (config.minimumBalance && config.minimumBalance.amount < 0) {
      errors.push(new ValidationError('minimumBalance', 'Minimum balance cannot be negative'));
    }

    if (config.overdraftLimit && config.overdraftLimit.amount < 0) {
      errors.push(new ValidationError('overdraftLimit', 'Overdraft limit cannot be negative'));
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }

  /**
   * Validate account meets product requirements
   */
  static validateAccountMeetsRequirements(
    balance: Balance,
    product: ProductConfiguration
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Check minimum balance
    if (balance.ledgerBalance.amount < product.minimumBalance.amount) {
      errors.push(
        new ValidationError(
          'minimumBalance',
          `Balance ${balance.ledgerBalance.amount} is below minimum ${product.minimumBalance.amount}`
        )
      );
    }

    return errors.length === 0 ? validResult() : invalidResult(...errors);
  }
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors = results.flatMap((r) => r.errors);
  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
