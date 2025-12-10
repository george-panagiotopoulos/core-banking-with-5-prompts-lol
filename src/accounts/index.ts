/**
 * Account Management Module
 * Public API exports for account management functionality
 */

// Core account entity
export { Account, AccountProps } from './account';

// Account service
export {
  AccountService,
  CreateAccountParams,
  AccountRepository
} from './account-service';

// Account number generation
export {
  AccountNumberGenerator,
  AccountNumberConfig
} from './account-number-generator';

// Balance management
export { BalanceService, BalanceRepository } from './balance-service';
