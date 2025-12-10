/**
 * Core Banking System
 *
 * A complete current account banking system with:
 * - Double-entry bookkeeping ledger
 * - Transaction processing engine
 * - Account management
 * - Balance tracking
 * - Product configuration
 *
 * @module core-banking-system
 */

// Core Domain
export * from './core/domain';
export * from './core/validators';

// Utilities
export { Money } from './utils/money';
export * from './utils/errors';
export { IdGenerator } from './utils/id-generator';

// Ledger System
export * from './ledger';

// Account Management
export * from './accounts';

// Transaction Processing
export * from './transactions';

// Product Configuration
export * from './products';

// Banking API
export {
  BankingAPI,
  bankingAPI,
  Result,
  success,
  failure,
  CreateAccountRequest,
  TransferRequest,
  DepositRequest,
  WithdrawalRequest,
  StatementRequest,
  AccountStatement,
  StatementEntry,
} from './api/banking-api';

/**
 * Quick start example:
 *
 * ```typescript
 * import { bankingAPI, Currency } from 'core-banking-system';
 *
 * // Create an account
 * const accountResult = await bankingAPI.createAccount({
 *   customerId: 'cust-123',
 *   customerType: 'INDIVIDUAL',
 *   productId: 'prod-standard',
 *   initialDeposit: 1000,
 *   currency: Currency.USD,
 * });
 *
 * if (accountResult.success) {
 *   const account = accountResult.data;
 *   console.log(`Account created: ${account.accountNumber.value}`);
 *
 *   // Check balance
 *   const balanceResult = await bankingAPI.getBalance(account.id);
 *   if (balanceResult.success) {
 *     console.log(`Balance: ${balanceResult.data.availableBalance.amount}`);
 *   }
 * }
 * ```
 */
