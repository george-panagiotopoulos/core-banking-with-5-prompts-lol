/**
 * Product Entity
 * Represents a banking product with its configuration and business logic
 */

import { Money } from '../core/domain';
import {
  AccountType,
  ProductStatus,
  FeeConfiguration,
  FeeType,
  InterestConfiguration,
  OverdraftConfiguration,
  TransactionLimits,
  ProductConfiguration,
  ValidationError
} from './types';
import { isGreaterThan, isLessThan, moneyEquals } from './money-utils';

export class Product {
  private readonly config: ProductConfiguration;

  constructor(config: ProductConfiguration) {
    this.validateConfiguration(config);
    this.config = { ...config };
  }

  // Getters
  get id(): string {
    return this.config.id;
  }

  get name(): string {
    return this.config.name;
  }

  get description(): string {
    return this.config.description;
  }

  get accountType(): AccountType {
    return this.config.accountType;
  }

  get status(): ProductStatus {
    return this.config.status;
  }

  get fees(): FeeConfiguration[] {
    return [...this.config.fees];
  }

  get interestConfig(): InterestConfiguration | undefined {
    return this.config.interestConfig;
  }

  get overdraftConfig(): OverdraftConfiguration | undefined {
    return this.config.overdraftConfig;
  }

  get transactionLimits(): TransactionLimits | undefined {
    return this.config.transactionLimits;
  }

  get minimumBalance(): Money | undefined {
    return this.config.minimumBalance;
  }

  get minimumOpeningDeposit(): Money | undefined {
    return this.config.minimumOpeningDeposit;
  }

  get features(): string[] {
    return this.config.features || [];
  }

  get createdAt(): Date {
    return this.config.createdAt;
  }

  get updatedAt(): Date {
    return this.config.updatedAt;
  }

  /**
   * Check if product is currently active
   */
  isActive(): boolean {
    return this.config.status === ProductStatus.ACTIVE;
  }

  /**
   * Get effective fees for the product based on balance and conditions
   */
  getEffectiveFees(currentBalance?: Money): FeeConfiguration[] {
    return this.config.fees.filter(fee => {
      // Check if fee should be waived
      if (!fee.waiveConditions) {
        return true;
      }

      // Waive if minimum balance requirement is met
      if (fee.waiveConditions.minimumBalance && currentBalance) {
        if (isGreaterThan(currentBalance, fee.waiveConditions.minimumBalance) ||
            moneyEquals(currentBalance, fee.waiveConditions.minimumBalance)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get the applicable interest rate for a given balance
   */
  getInterestRate(balance: Money): number {
    if (!this.config.interestConfig) {
      return 0;
    }

    const config = this.config.interestConfig;

    // Check minimum balance requirement
    if (config.minimumBalance && isLessThan(balance, config.minimumBalance)) {
      return 0;
    }

    // Check for tiered rates
    if (config.tieredRates && config.tieredRates.length > 0) {
      // Find the highest tier that applies
      const sortedTiers = [...config.tieredRates].sort((a, b) =>
        b.threshold.amount - a.threshold.amount
      );

      for (const tier of sortedTiers) {
        if (isGreaterThan(balance, tier.threshold) || moneyEquals(balance, tier.threshold)) {
          return tier.rate;
        }
      }
    }

    // Return base rate if no tiers apply
    return config.annualRate;
  }

  /**
   * Get fee configuration by type
   */
  getFeeByType(feeType: FeeType): FeeConfiguration | undefined {
    return this.config.fees.find(fee => fee.type === feeType);
  }

  /**
   * Check if overdraft is allowed
   */
  hasOverdraftProtection(): boolean {
    return this.config.overdraftConfig?.allowed || false;
  }

  /**
   * Get overdraft limit
   */
  getOverdraftLimit(): Money | undefined {
    return this.config.overdraftConfig?.limit;
  }

  /**
   * Check if product supports interest
   */
  hasInterest(): boolean {
    return this.config.interestConfig !== undefined;
  }

  /**
   * Get configuration as plain object
   */
  toConfiguration(): ProductConfiguration {
    return { ...this.config };
  }

  /**
   * Validate product configuration
   */
  private validateConfiguration(config: ProductConfiguration): void {
    // Validate required fields
    if (!config.id || config.id.trim() === '') {
      throw new ValidationError('Product ID is required');
    }

    if (!config.name || config.name.trim() === '') {
      throw new ValidationError('Product name is required');
    }

    if (!config.accountType) {
      throw new ValidationError('Account type is required');
    }

    if (!Object.values(AccountType).includes(config.accountType)) {
      throw new ValidationError(`Invalid account type: ${config.accountType}`);
    }

    if (!config.status) {
      throw new ValidationError('Product status is required');
    }

    if (!Object.values(ProductStatus).includes(config.status)) {
      throw new ValidationError(`Invalid product status: ${config.status}`);
    }

    // Validate fees
    if (!config.fees || config.fees.length === 0) {
      throw new ValidationError('At least one fee configuration is required');
    }

    for (const fee of config.fees) {
      this.validateFeeConfiguration(fee);
    }

    // Validate interest configuration
    if (config.interestConfig) {
      this.validateInterestConfiguration(config.interestConfig);
    }

    // Validate overdraft configuration
    if (config.overdraftConfig) {
      this.validateOverdraftConfiguration(config.overdraftConfig);
    }

    // Validate minimum balance
    if (config.minimumBalance && config.minimumBalance.amount < 0) {
      throw new ValidationError('Minimum balance cannot be negative');
    }

    // Validate minimum opening deposit
    if (config.minimumOpeningDeposit && config.minimumOpeningDeposit.amount < 0) {
      throw new ValidationError('Minimum opening deposit cannot be negative');
    }

    // Validate transaction limits
    if (config.transactionLimits) {
      this.validateTransactionLimits(config.transactionLimits);
    }
  }

  private validateFeeConfiguration(fee: FeeConfiguration): void {
    if (!fee.type) {
      throw new ValidationError('Fee type is required');
    }

    if (!Object.values(FeeType).includes(fee.type)) {
      throw new ValidationError(`Invalid fee type: ${fee.type}`);
    }

    if (!fee.amount || fee.amount.amount < 0) {
      throw new ValidationError('Fee amount must be non-negative');
    }

    if (fee.percentage !== undefined && (fee.percentage < 0 || fee.percentage > 100)) {
      throw new ValidationError('Fee percentage must be between 0 and 100');
    }
  }

  private validateInterestConfiguration(config: InterestConfiguration): void {
    if (config.annualRate < 0 || config.annualRate > 100) {
      throw new ValidationError('Interest rate must be between 0 and 100');
    }

    if (config.tieredRates) {
      for (const tier of config.tieredRates) {
        if (tier.rate < 0 || tier.rate > 100) {
          throw new ValidationError('Tiered interest rate must be between 0 and 100');
        }
      }
    }
  }

  private validateOverdraftConfiguration(config: OverdraftConfiguration): void {
    if (config.allowed && config.limit && config.limit.amount < 0) {
      throw new ValidationError('Overdraft limit cannot be negative');
    }

    if (config.interestRate !== undefined && (config.interestRate < 0 || config.interestRate > 100)) {
      throw new ValidationError('Overdraft interest rate must be between 0 and 100');
    }
  }

  private validateTransactionLimits(limits: TransactionLimits): void {
    if (limits.dailyWithdrawalLimit && limits.dailyWithdrawalLimit.amount < 0) {
      throw new ValidationError('Daily withdrawal limit cannot be negative');
    }

    if (limits.dailyDepositLimit && limits.dailyDepositLimit.amount < 0) {
      throw new ValidationError('Daily deposit limit cannot be negative');
    }

    if (limits.perTransactionLimit && limits.perTransactionLimit.amount < 0) {
      throw new ValidationError('Per transaction limit cannot be negative');
    }

    if (limits.monthlyTransactionCount !== undefined && limits.monthlyTransactionCount < 0) {
      throw new ValidationError('Monthly transaction count cannot be negative');
    }
  }
}
