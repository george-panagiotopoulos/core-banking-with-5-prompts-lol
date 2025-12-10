/**
 * Product Module Exports
 */

export { Product } from './product';
export { ProductService } from './product-service';
export { ProductRules } from './product-rules';
export { FeeCalculator } from './fee-calculator';

// Export product-specific types
export {
  AccountType,
  ProductStatus,
  FeeType,
  InterestCalculationMethod,
  TransactionType,
  ProductConfiguration,
  FeeConfiguration,
  InterestConfiguration,
  OverdraftConfiguration,
  TransactionLimits,
  ProductFilters,
  ValidationError,
  BusinessRuleError,
  InsufficientFundsError
} from './types';

// Export Money utilities
export {
  createMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  divideMoney,
  isGreaterThan,
  isLessThan,
  moneyEquals,
  formatMoney,
  toBaseUnits,
  fromBaseUnits,
  parseMoney,
  moneyFromDecimal,
  toDecimal
} from './money-utils';

// Re-export core domain types for convenience
export { Money, Currency, Transaction, TransactionType as CoreTransactionType } from '../core/domain';
