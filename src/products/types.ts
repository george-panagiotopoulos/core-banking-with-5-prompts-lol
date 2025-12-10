/**
 * Product Module Types
 * Extends the core domain types with product-specific configurations
 */

import {
  Money,
  ProductType,
  TransactionLimits as CoreTransactionLimits
} from '../core/domain';

// Product Status (extends what products can be in)
export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEPRECATED = 'DEPRECATED'
}

// Account Type for product classification
export enum AccountType {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  BUSINESS = 'BUSINESS'
}

// Fee Types
export enum FeeType {
  MONTHLY_MAINTENANCE = 'MONTHLY_MAINTENANCE',
  TRANSACTION = 'TRANSACTION',
  OVERDRAFT = 'OVERDRAFT',
  ATM_WITHDRAWAL = 'ATM_WITHDRAWAL',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  INTERNATIONAL_TRANSFER = 'INTERNATIONAL_TRANSFER',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS'
}

// Interest Calculation Methods
export enum InterestCalculationMethod {
  SIMPLE = 'SIMPLE',
  COMPOUND_DAILY = 'COMPOUND_DAILY',
  COMPOUND_MONTHLY = 'COMPOUND_MONTHLY'
}

// Fee Configuration
export interface FeeConfiguration {
  type: FeeType;
  amount: Money;
  percentage?: number;
  waiveConditions?: {
    minimumBalance?: Money;
    monthlyTransactionCount?: number;
  };
}

// Interest Configuration
export interface InterestConfiguration {
  annualRate: number;
  calculationMethod: InterestCalculationMethod;
  minimumBalance?: Money;
  tieredRates?: Array<{
    threshold: Money;
    rate: number;
  }>;
}

// Overdraft Configuration
export interface OverdraftConfiguration {
  allowed: boolean;
  limit?: Money;
  fee?: Money;
  interestRate?: number;
}

// Extended Transaction Limits for Products
export interface TransactionLimits extends Partial<CoreTransactionLimits> {
  dailyWithdrawalLimit?: Money;
  dailyDepositLimit?: Money;
  perTransactionLimit?: Money;
  monthlyTransactionCount?: number;
}

// Product Configuration
export interface ProductConfiguration {
  id: string;
  name: string;
  description: string;
  accountType: AccountType;
  status: ProductStatus;
  fees: FeeConfiguration[];
  interestConfig?: InterestConfiguration;
  overdraftConfig?: OverdraftConfiguration;
  transactionLimits?: TransactionLimits;
  minimumBalance?: Money;
  minimumOpeningDeposit?: Money;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Product Filters
export interface ProductFilters {
  accountType?: AccountType;
  status?: ProductStatus;
  activeOnly?: boolean;
  hasOverdraft?: boolean;
  minInterestRate?: number;
}

// Error Types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}
