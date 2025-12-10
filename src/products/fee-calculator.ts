/**
 * Fee Calculator
 * Calculates various fees for banking products
 */

import { Money, Transaction, TransactionType } from '../core/domain';
import { FeeType } from './types';
import { Product } from './product';
import {
  createMoney,
  addMoney,
  multiplyMoney,
  isGreaterThan,
  moneyEquals
} from './money-utils';

export class FeeCalculator {
  /**
   * Calculate monthly maintenance fee for a product
   */
  calculateMonthlyFee(product: Product, currentBalance?: Money): Money {
    const monthlyFee = product.getFeeByType(FeeType.MONTHLY_MAINTENANCE);

    if (!monthlyFee) {
      return createMoney(0, currentBalance?.currency);
    }

    // Check waive conditions
    if (monthlyFee.waiveConditions && currentBalance) {
      if (monthlyFee.waiveConditions.minimumBalance) {
        const minBalance = monthlyFee.waiveConditions.minimumBalance;
        if (isGreaterThan(currentBalance, minBalance) || moneyEquals(currentBalance, minBalance)) {
          return createMoney(0, currentBalance.currency);
        }
      }
    }

    return monthlyFee.amount;
  }

  /**
   * Calculate transaction fee for a specific transaction
   */
  calculateTransactionFee(product: Product, transaction: Transaction): Money {
    let totalFee = createMoney(0, transaction.amount.currency);

    // Get transaction-specific fee
    const transactionFee = this.getTransactionSpecificFee(product, transaction.type);
    if (transactionFee) {
      // Apply fixed fee
      totalFee = addMoney(totalFee, transactionFee.amount);

      // Apply percentage fee if configured
      if (transactionFee.percentage) {
        const percentageFee = multiplyMoney(transaction.amount, transactionFee.percentage / 100);
        totalFee = addMoney(totalFee, percentageFee);
      }
    }

    return totalFee;
  }

  /**
   * Calculate overdraft fee
   */
  calculateOverdraftFee(product: Product, overdraftAmount: Money): Money {
    if (!product.hasOverdraftProtection()) {
      return createMoney(0, overdraftAmount.currency);
    }

    const overdraftConfig = product.overdraftConfig!;

    // If no overdraft fee configured, return zero
    if (!overdraftConfig.fee) {
      return createMoney(0, overdraftAmount.currency);
    }

    return overdraftConfig.fee;
  }

  /**
   * Calculate interest charge (for overdraft or negative balance)
   */
  calculateInterestCharge(
    product: Product,
    averageBalance: Money,
    days: number
  ): Money {
    // Only charge interest if balance is negative (overdraft)
    if (averageBalance.amount >= 0) {
      return createMoney(0, averageBalance.currency);
    }

    const overdraftConfig = product.overdraftConfig;

    if (!overdraftConfig || !overdraftConfig.interestRate) {
      return createMoney(0, averageBalance.currency);
    }

    // Calculate interest on the overdraft amount
    const overdraftAmount = createMoney(Math.abs(averageBalance.amount), averageBalance.currency);
    const dailyRate = overdraftConfig.interestRate / 100 / 365;
    const interestCharge = overdraftAmount.amount * dailyRate * days;

    return createMoney(interestCharge, averageBalance.currency);
  }

  /**
   * Calculate ATM withdrawal fee
   */
  calculateATMFee(product: Product, isOwnNetwork: boolean = true): Money {
    const atmFee = product.getFeeByType(FeeType.ATM_WITHDRAWAL);

    if (!atmFee) {
      return createMoney(0);
    }

    // Typically, own network ATMs are free
    if (isOwnNetwork) {
      return createMoney(0, atmFee.amount.currency);
    }

    return atmFee.amount;
  }

  /**
   * Calculate wire transfer fee
   */
  calculateWireTransferFee(product: Product, isInternational: boolean = false): Money {
    const feeType = isInternational
      ? FeeType.INTERNATIONAL_TRANSFER
      : FeeType.WIRE_TRANSFER;

    const transferFee = product.getFeeByType(feeType);

    if (!transferFee) {
      return createMoney(0);
    }

    return transferFee.amount;
  }

  /**
   * Calculate insufficient funds fee
   */
  calculateInsufficientFundsFee(product: Product): Money {
    const nsfFee = product.getFeeByType(FeeType.INSUFFICIENT_FUNDS);

    if (!nsfFee) {
      return createMoney(0);
    }

    return nsfFee.amount;
  }

  /**
   * Calculate total fees for a period
   */
  calculateTotalFeesForPeriod(
    product: Product,
    transactions: Transaction[],
    currentBalance: Money,
    days: number = 30
  ): Money {
    let totalFees = createMoney(0, currentBalance.currency);

    // Add monthly maintenance fee
    const monthlyFee = this.calculateMonthlyFee(product, currentBalance);
    totalFees = addMoney(totalFees, monthlyFee);

    // Add transaction fees
    for (const transaction of transactions) {
      const transactionFee = this.calculateTransactionFee(product, transaction);
      totalFees = addMoney(totalFees, transactionFee);
    }

    // Add overdraft interest charges if applicable
    if (currentBalance.amount < 0) {
      const interestCharge = this.calculateInterestCharge(product, currentBalance, days);
      totalFees = addMoney(totalFees, interestCharge);
    }

    return totalFees;
  }

  /**
   * Calculate fee with waive conditions
   */
  calculateFeeWithWaivers(
    product: Product,
    feeType: FeeType,
    currentBalance?: Money,
    monthlyTransactionCount?: number
  ): Money {
    const fee = product.getFeeByType(feeType);

    if (!fee) {
      return createMoney(0, currentBalance?.currency);
    }

    // Check waive conditions
    if (fee.waiveConditions) {
      // Check minimum balance waiver
      if (fee.waiveConditions.minimumBalance && currentBalance) {
        if (isGreaterThan(currentBalance, fee.waiveConditions.minimumBalance) ||
            moneyEquals(currentBalance, fee.waiveConditions.minimumBalance)) {
          return createMoney(0, currentBalance.currency);
        }
      }

      // Check monthly transaction count waiver
      if (fee.waiveConditions.monthlyTransactionCount !== undefined &&
          monthlyTransactionCount !== undefined) {
        if (monthlyTransactionCount >= fee.waiveConditions.monthlyTransactionCount) {
          return createMoney(0, currentBalance?.currency);
        }
      }
    }

    return fee.amount;
  }

  /**
   * Estimate monthly fees based on typical usage
   */
  estimateMonthlyFees(
    product: Product,
    averageBalance: Money,
    estimatedTransactions: number,
    estimatedATMWithdrawals: number = 0,
    estimatedWireTransfers: number = 0
  ): Money {
    let estimatedFees = createMoney(0, averageBalance.currency);

    // Monthly maintenance fee
    const maintenanceFee = this.calculateMonthlyFee(product, averageBalance);
    estimatedFees = addMoney(estimatedFees, maintenanceFee);

    // Estimate transaction fees
    const transactionFee = product.getFeeByType(FeeType.TRANSACTION);
    if (transactionFee) {
      const totalTransactionFees = multiplyMoney(transactionFee.amount, estimatedTransactions);
      estimatedFees = addMoney(estimatedFees, totalTransactionFees);
    }

    // Estimate ATM fees
    const atmFee = product.getFeeByType(FeeType.ATM_WITHDRAWAL);
    if (atmFee && estimatedATMWithdrawals > 0) {
      const totalATMFees = multiplyMoney(atmFee.amount, estimatedATMWithdrawals);
      estimatedFees = addMoney(estimatedFees, totalATMFees);
    }

    // Estimate wire transfer fees
    const wireFee = product.getFeeByType(FeeType.WIRE_TRANSFER);
    if (wireFee && estimatedWireTransfers > 0) {
      const totalWireFees = multiplyMoney(wireFee.amount, estimatedWireTransfers);
      estimatedFees = addMoney(estimatedFees, totalWireFees);
    }

    return estimatedFees;
  }

  // Private helper methods

  private getTransactionSpecificFee(product: Product, transactionType: TransactionType) {
    switch (transactionType) {
      case TransactionType.WITHDRAWAL:
        return product.getFeeByType(FeeType.TRANSACTION) ||
               product.getFeeByType(FeeType.ATM_WITHDRAWAL);

      case TransactionType.TRANSFER:
        return product.getFeeByType(FeeType.WIRE_TRANSFER) ||
               product.getFeeByType(FeeType.TRANSACTION);

      case TransactionType.OVERDRAFT:
        return product.getFeeByType(FeeType.OVERDRAFT);

      default:
        return product.getFeeByType(FeeType.TRANSACTION);
    }
  }
}
