/**
 * Product Rules
 * Business rules and validations for product operations
 */

import { Money, Transaction, TransactionType } from '../core/domain';
import {
  BusinessRuleError,
  InsufficientFundsError,
  ValidationError
} from './types';
import { Product } from './product';
import {
  createMoney,
  addMoney,
  subtractMoney,
  isGreaterThan,
  isLessThan,
  moneyEquals
} from './money-utils';

export class ProductRules {
  /**
   * Validate if balance meets minimum balance requirement
   */
  validateMinimumBalance(product: Product, balance: Money): boolean {
    const minBalance = product.minimumBalance;

    if (!minBalance) {
      return true; // No minimum balance requirement
    }

    return isGreaterThan(balance, minBalance) || moneyEquals(balance, minBalance);
  }

  /**
   * Calculate available overdraft amount
   */
  calculateOverdraftAvailable(product: Product, currentBalance: Money): Money {
    // If no overdraft protection, return zero
    if (!product.hasOverdraftProtection()) {
      return createMoney(0, currentBalance.currency);
    }

    const overdraftConfig = product.overdraftConfig!;

    // If overdraft limit is not set, return zero
    if (!overdraftConfig.limit) {
      return createMoney(0, currentBalance.currency);
    }

    // If balance is positive, full overdraft limit is available
    if (currentBalance.amount > 0) {
      return overdraftConfig.limit;
    }

    // If balance is negative, calculate remaining overdraft
    const usedOverdraft = createMoney(Math.abs(currentBalance.amount), currentBalance.currency);
    const availableOverdraft = subtractMoney(overdraftConfig.limit, usedOverdraft);

    return availableOverdraft;
  }

  /**
   * Calculate interest for a given balance and period
   */
  calculateInterest(product: Product, balance: Money, days: number): Money {
    if (!product.hasInterest()) {
      return createMoney(0, balance.currency);
    }

    const interestRate = product.getInterestRate(balance);

    if (interestRate === 0) {
      return createMoney(0, balance.currency);
    }

    const interestConfig = product.interestConfig!;

    switch (interestConfig.calculationMethod) {
      case 'SIMPLE':
        return this.calculateSimpleInterest(balance, interestRate, days);

      case 'COMPOUND_DAILY':
        return this.calculateCompoundInterest(balance, interestRate, days, 365);

      case 'COMPOUND_MONTHLY':
        return this.calculateCompoundInterest(balance, interestRate, days, 12);

      default:
        return createMoney(0, balance.currency);
    }
  }

  /**
   * Calculate fees for a specific transaction type
   */
  calculateFees(product: Product, transactionType: TransactionType): Money {
    const fees = product.fees;
    let totalFee = createMoney(0);

    for (const feeConfig of fees) {
      // Map transaction types to fee types
      if (this.shouldApplyFee(feeConfig.type, transactionType)) {
        totalFee = addMoney(totalFee, feeConfig.amount);
      }
    }

    return totalFee;
  }

  /**
   * Validate if a transaction is allowed based on product rules
   */
  validateTransactionAllowed(product: Product, transaction: Transaction): boolean {
    // Check if product is active
    if (!product.isActive()) {
      throw new BusinessRuleError('Product is not active');
    }

    // Check transaction limits
    const limits = product.transactionLimits;

    if (!limits) {
      return true; // No limits configured
    }

    // Check per-transaction limit
    if (limits.perTransactionLimit) {
      if (isGreaterThan(transaction.amount, limits.perTransactionLimit)) {
        throw new BusinessRuleError(
          `Transaction amount ${transaction.amount} exceeds per-transaction limit ${limits.perTransactionLimit}`
        );
      }
    }

    return true;
  }

  /**
   * Validate withdrawal transaction
   */
  validateWithdrawal(
    product: Product,
    currentBalance: Money,
    withdrawalAmount: Money
  ): boolean {
    // Check if withdrawal would violate minimum balance
    const balanceAfterWithdrawal = subtractMoney(currentBalance, withdrawalAmount);

    // If product has overdraft protection
    if (product.hasOverdraftProtection()) {
      const availableOverdraft = this.calculateOverdraftAvailable(product, currentBalance);
      const totalAvailable = addMoney(currentBalance, availableOverdraft);

      if (isGreaterThan(withdrawalAmount, totalAvailable)) {
        throw new InsufficientFundsError(
          `Insufficient funds. Available: ${totalAvailable}, Requested: ${withdrawalAmount}`
        );
      }

      return true;
    }

    // No overdraft protection - must have sufficient balance
    if (isGreaterThan(withdrawalAmount, currentBalance)) {
      throw new InsufficientFundsError(
        `Insufficient funds. Available: ${currentBalance}, Requested: ${withdrawalAmount}`
      );
    }

    // Check minimum balance after withdrawal
    if (!this.validateMinimumBalance(product, balanceAfterWithdrawal)) {
      const minBalance = product.minimumBalance!;
      throw new BusinessRuleError(
        `Withdrawal would result in balance below minimum requirement of ${minBalance}`
      );
    }

    return true;
  }

  /**
   * Validate daily withdrawal limit
   */
  validateDailyWithdrawalLimit(
    product: Product,
    currentDailyTotal: Money,
    newWithdrawal: Money
  ): boolean {
    const limits = product.transactionLimits;

    if (!limits || !limits.dailyWithdrawalLimit) {
      return true; // No daily limit configured
    }

    const newTotal = addMoney(currentDailyTotal, newWithdrawal);

    if (isGreaterThan(newTotal, limits.dailyWithdrawalLimit)) {
      throw new BusinessRuleError(
        `Daily withdrawal limit exceeded. Limit: ${limits.dailyWithdrawalLimit}, Current: ${currentDailyTotal}, Requested: ${newWithdrawal}`
      );
    }

    return true;
  }

  /**
   * Validate monthly transaction count
   */
  validateMonthlyTransactionCount(
    product: Product,
    currentMonthlyCount: number
  ): boolean {
    const limits = product.transactionLimits;

    if (!limits || !limits.monthlyTransactionCount) {
      return true; // No monthly limit configured
    }

    if (currentMonthlyCount >= limits.monthlyTransactionCount) {
      throw new BusinessRuleError(
        `Monthly transaction limit exceeded. Limit: ${limits.monthlyTransactionCount}`
      );
    }

    return true;
  }

  /**
   * Check if minimum opening deposit is met
   */
  validateMinimumOpeningDeposit(product: Product, deposit: Money): boolean {
    const minDeposit = product.minimumOpeningDeposit;

    if (!minDeposit) {
      return true;
    }

    if (isLessThan(deposit, minDeposit)) {
      throw new ValidationError(
        `Opening deposit ${deposit} is below minimum requirement of ${minDeposit}`
      );
    }

    return true;
  }

  // Private helper methods

  private calculateSimpleInterest(principal: Money, rate: number, days: number): Money {
    const dailyRate = rate / 100 / 365;
    const interest = principal.amount * dailyRate * days;
    return createMoney(interest, principal.currency);
  }

  private calculateCompoundInterest(
    principal: Money,
    rate: number,
    days: number,
    periodsPerYear: number
  ): Money {
    const ratePerPeriod = rate / 100 / periodsPerYear;
    const periods = (days / 365) * periodsPerYear;
    const compoundFactor = Math.pow(1 + ratePerPeriod, periods);
    const finalAmount = principal.amount * compoundFactor;
    const interest = finalAmount - principal.amount;
    return createMoney(interest, principal.currency);
  }

  private shouldApplyFee(feeType: string, transactionType: TransactionType): boolean {
    const feeMapping: Record<string, TransactionType[]> = {
      'TRANSACTION': [TransactionType.WITHDRAWAL, TransactionType.TRANSFER],
      'ATM_WITHDRAWAL': [TransactionType.WITHDRAWAL],
      'WIRE_TRANSFER': [TransactionType.TRANSFER],
      'INTERNATIONAL_TRANSFER': [TransactionType.TRANSFER],
      'OVERDRAFT': [TransactionType.OVERDRAFT],
      'INSUFFICIENT_FUNDS': [TransactionType.WITHDRAWAL, TransactionType.TRANSFER]
    };

    const applicableTypes = feeMapping[feeType] || [];
    return applicableTypes.includes(transactionType);
  }
}
