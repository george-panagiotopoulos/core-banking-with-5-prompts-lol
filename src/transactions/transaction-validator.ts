/**
 * Transaction Validator for validating transaction constraints
 */

import { Money, Account, AccountStatus, ValidationResult, Balance } from '../core/domain';
import {
  InvalidAmountError,
  AccountNotFoundError,
  AccountInactiveError,
  InsufficientFundsError,
  DailyLimitExceededError,
  CurrencyMismatchError
} from '../core/errors';
import { formatMoney, isGreaterThanOrEqual, addMoney, isGreaterThan } from '../core/money-utils';

export interface AccountRepository {
  findById(accountId: string): Promise<Account | null>;
  getBalance(accountId: string): Promise<Balance | null>;
  getDailyTransactionTotal(accountId: string, date: Date): Promise<Money>;
  getDailyWithdrawalTotal(accountId: string, date: Date): Promise<Money>;
  getTransactionLimits(productId: string): Promise<{ dailyTransferLimit?: Money; dailyWithdrawalLimit?: Money }>;
}

export class TransactionValidator {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * Validate amount is positive and properly formatted
   */
  validateAmount(amount: Money): boolean {
    if (amount.amount <= 0) {
      throw new InvalidAmountError(
        formatMoney(amount),
        'Amount must be greater than zero'
      );
    }

    // Check decimal precision based on scale
    const divisor = Math.pow(10, amount.scale);
    const displayAmount = amount.amount / divisor;
    const decimalPlaces = (displayAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > amount.scale) {
      throw new InvalidAmountError(
        formatMoney(amount),
        `Amount cannot have more than ${amount.scale} decimal places`
      );
    }

    // Check maximum transaction amount (e.g., 1 million in smallest unit)
    const maxAmount = 1000000 * divisor;
    if (amount.amount > maxAmount) {
      throw new InvalidAmountError(
        formatMoney(amount),
        `Amount exceeds maximum allowed: ${amount.currency} ${maxAmount / divisor}`
      );
    }

    return true;
  }

  /**
   * Validate that both accounts exist and are active
   */
  async validateAccounts(sourceId: string, destId: string): Promise<boolean> {
    const sourceAccount = await this.accountRepository.findById(sourceId);
    if (!sourceAccount) {
      throw new AccountNotFoundError(sourceId);
    }

    const destAccount = await this.accountRepository.findById(destId);
    if (!destAccount) {
      throw new AccountNotFoundError(destId);
    }

    // Check source account is active
    if (sourceAccount.status !== AccountStatus.ACTIVE) {
      throw new AccountInactiveError(sourceId, sourceAccount.status);
    }

    // Check destination account is active, pending, or dormant (can receive funds)
    if (destAccount.status === AccountStatus.CLOSED || destAccount.status === AccountStatus.FROZEN) {
      throw new AccountInactiveError(destId, destAccount.status);
    }

    // Check currency compatibility
    if (sourceAccount.currency !== destAccount.currency) {
      throw new CurrencyMismatchError(
        sourceAccount.currency,
        destAccount.currency
      );
    }

    return true;
  }

  /**
   * Validate that a single account exists and is active
   */
  async validateAccount(accountId: string, allowInactive: boolean = false): Promise<Account> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    if (!allowInactive && account.status !== AccountStatus.ACTIVE) {
      throw new AccountInactiveError(accountId, account.status);
    }

    if (account.status === AccountStatus.CLOSED) {
      throw new AccountInactiveError(accountId, account.status);
    }

    return account;
  }

  /**
   * Validate sufficient funds in account
   */
  async validateSufficientFunds(accountId: string, amount: Money): Promise<boolean> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    const balance = await this.accountRepository.getBalance(accountId);
    if (!balance) {
      throw new AccountNotFoundError(`Balance not found for account ${accountId}`);
    }

    // Check currency match
    if (balance.availableBalance.currency !== amount.currency) {
      throw new CurrencyMismatchError(balance.availableBalance.currency, amount.currency);
    }

    // Check sufficient balance (available balance includes overdraft)
    if (!isGreaterThanOrEqual(balance.availableBalance, amount)) {
      throw new InsufficientFundsError(
        accountId,
        formatMoney(amount),
        formatMoney(balance.availableBalance)
      );
    }

    return true;
  }

  /**
   * Validate daily transaction limits
   */
  async validateDailyLimits(accountId: string, amount: Money): Promise<boolean> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    const limits = await this.accountRepository.getTransactionLimits(account.productId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check daily transfer limit
    if (limits.dailyTransferLimit) {
      const dailyTotal = await this.accountRepository.getDailyTransactionTotal(accountId, today);
      const newTotal = addMoney(dailyTotal, amount);

      if (isGreaterThan(newTotal, limits.dailyTransferLimit)) {
        throw new DailyLimitExceededError(
          accountId,
          'transfer',
          formatMoney(limits.dailyTransferLimit)
        );
      }
    }

    return true;
  }

  /**
   * Validate daily withdrawal limits
   */
  async validateDailyWithdrawalLimit(accountId: string, amount: Money): Promise<boolean> {
    const account = await this.accountRepository.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }

    const limits = await this.accountRepository.getTransactionLimits(account.productId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check daily withdrawal limit
    if (limits.dailyWithdrawalLimit) {
      const dailyTotal = await this.accountRepository.getDailyWithdrawalTotal(accountId, today);
      const newTotal = addMoney(dailyTotal, amount);

      if (isGreaterThan(newTotal, limits.dailyWithdrawalLimit)) {
        throw new DailyLimitExceededError(
          accountId,
          'withdrawal',
          formatMoney(limits.dailyWithdrawalLimit)
        );
      }
    }

    return true;
  }

  /**
   * Comprehensive validation for transfer transactions
   */
  async validateTransfer(sourceId: string, destId: string, amount: Money): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Validate amount
      this.validateAmount(amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate both accounts
      await this.validateAccounts(sourceId, destId);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate sufficient funds
      await this.validateSufficientFunds(sourceId, amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate daily limits
      await this.validateDailyLimits(sourceId, amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Comprehensive validation for deposit transactions
   */
  async validateDeposit(accountId: string, amount: Money): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Validate amount
      this.validateAmount(amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate account (allow inactive for deposits)
      await this.validateAccount(accountId, true);
    } catch (error: any) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Comprehensive validation for withdrawal transactions
   */
  async validateWithdrawal(accountId: string, amount: Money): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Validate amount
      this.validateAmount(amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate account
      await this.validateAccount(accountId, false);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate sufficient funds
      await this.validateSufficientFunds(accountId, amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    try {
      // Validate daily withdrawal limits
      await this.validateDailyWithdrawalLimit(accountId, amount);
    } catch (error: any) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
