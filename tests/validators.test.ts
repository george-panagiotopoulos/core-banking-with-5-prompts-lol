/**
 * Validator Tests
 */

import {
  AccountValidator,
  TransactionValidator,
  ProductValidator,
  validResult,
  invalidResult,
  combineValidationResults,
} from '../src/core/validators';
import {
  Account,
  AccountStatus,
  TransactionStatus,
  Transaction,
  TransactionType,
  Balance,
  ProductConfiguration,
  Currency,
  Money,
} from '../src/core/domain';
import { ValidationError } from '../src/utils/errors';

// Helper to create mock account
function createMockAccount(overrides: Partial<Account> = {}): Account {
  const currency = Currency.USD;
  return {
    id: 'acc-123',
    accountNumber: {
      value: '0100000100000101',
      bankCode: '01',
      branchCode: '000001',
      accountSequence: '00000001',
      checkDigit: '01',
    },
    customerId: { value: 'cust-123', type: 'INDIVIDUAL' },
    productId: 'prod-123',
    status: AccountStatus.ACTIVE,
    currency,
    createdAt: new Date(),
    updatedAt: new Date(),
    closedAt: null,
    overdraftLimit: null,
    metadata: {},
    version: 1,
    ...overrides,
  };
}

// Helper to create mock balance
function createMockBalance(overrides: Partial<Balance> = {}): Balance {
  const currency = Currency.USD;
  return {
    accountId: 'acc-123',
    availableBalance: { amount: 1000, currency, scale: 2 },
    ledgerBalance: { amount: 1000, currency, scale: 2 },
    pendingBalance: { amount: 0, currency, scale: 2 },
    heldBalance: { amount: 0, currency, scale: 2 },
    currency,
    lastUpdatedAt: new Date(),
    lastPostingDate: new Date(),
    overdraftUsage: null,
    version: 1,
    ...overrides,
  };
}

describe('AccountValidator', () => {
  describe('canReceiveTransaction', () => {
    it('should allow active account to receive transactions', () => {
      const account = createMockAccount({ status: AccountStatus.ACTIVE });

      const result = AccountValidator.canReceiveTransaction(account);

      expect(result.isValid).toBe(true);
    });

    it('should reject closed account', () => {
      const account = createMockAccount({ status: AccountStatus.CLOSED });

      const result = AccountValidator.canReceiveTransaction(account);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain('closed');
    });

    it('should reject frozen account', () => {
      const account = createMockAccount({ status: AccountStatus.FROZEN });

      const result = AccountValidator.canReceiveTransaction(account);

      expect(result.isValid).toBe(false);
    });

    it('should reject suspended account', () => {
      const account = createMockAccount({ status: AccountStatus.SUSPENDED });

      const result = AccountValidator.canReceiveTransaction(account);

      expect(result.isValid).toBe(false);
    });

    it('should reject pending account', () => {
      const account = createMockAccount({ status: AccountStatus.PENDING });

      const result = AccountValidator.canReceiveTransaction(account);

      expect(result.isValid).toBe(false);
    });
  });

  describe('canSendTransaction', () => {
    it('should allow active account to send transactions', () => {
      const account = createMockAccount({ status: AccountStatus.ACTIVE });

      const result = AccountValidator.canSendTransaction(account);

      expect(result.isValid).toBe(true);
    });

    it('should reject non-active accounts', () => {
      const statuses = [
        AccountStatus.PENDING,
        AccountStatus.SUSPENDED,
        AccountStatus.FROZEN,
        AccountStatus.CLOSED,
        AccountStatus.DORMANT,
      ];

      for (const status of statuses) {
        const account = createMockAccount({ status });
        const result = AccountValidator.canSendTransaction(account);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('canTransitionTo', () => {
    it('should allow valid status transitions', () => {
      const testCases = [
        { from: AccountStatus.PENDING, to: AccountStatus.ACTIVE },
        { from: AccountStatus.ACTIVE, to: AccountStatus.SUSPENDED },
        { from: AccountStatus.ACTIVE, to: AccountStatus.CLOSED },
        { from: AccountStatus.SUSPENDED, to: AccountStatus.ACTIVE },
        { from: AccountStatus.FROZEN, to: AccountStatus.ACTIVE },
      ];

      for (const { from, to } of testCases) {
        const account = createMockAccount({ status: from });
        const result = AccountValidator.canTransitionTo(account, to);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid status transitions', () => {
      const testCases = [
        { from: AccountStatus.CLOSED, to: AccountStatus.ACTIVE },
        { from: AccountStatus.PENDING, to: AccountStatus.SUSPENDED },
      ];

      for (const { from, to } of testCases) {
        const account = createMockAccount({ status: from });
        const result = AccountValidator.canTransitionTo(account, to);
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('canClose', () => {
    it('should allow closing account with zero balance', () => {
      const account = createMockAccount();
      const balance = createMockBalance({
        ledgerBalance: { amount: 0, currency: Currency.USD, scale: 2 },
        pendingBalance: { amount: 0, currency: Currency.USD, scale: 2 },
        heldBalance: { amount: 0, currency: Currency.USD, scale: 2 },
      });

      const result = AccountValidator.canClose(account, balance);

      expect(result.isValid).toBe(true);
    });

    it('should reject closing account with non-zero balance', () => {
      const account = createMockAccount();
      const balance = createMockBalance({
        ledgerBalance: { amount: 100, currency: Currency.USD, scale: 2 },
      });

      const result = AccountValidator.canClose(account, balance);

      expect(result.isValid).toBe(false);
    });

    it('should reject closing account with pending transactions', () => {
      const account = createMockAccount();
      const balance = createMockBalance({
        ledgerBalance: { amount: 0, currency: Currency.USD, scale: 2 },
        pendingBalance: { amount: 50, currency: Currency.USD, scale: 2 },
      });

      const result = AccountValidator.canClose(account, balance);

      expect(result.isValid).toBe(false);
    });
  });
});

describe('TransactionValidator', () => {
  describe('validateAmount', () => {
    it('should accept positive amounts', () => {
      const amount: Money = { amount: 100, currency: Currency.USD, scale: 2 };

      const result = TransactionValidator.validateAmount(amount);

      expect(result.isValid).toBe(true);
    });

    it('should reject zero amount', () => {
      const amount: Money = { amount: 0, currency: Currency.USD, scale: 2 };

      const result = TransactionValidator.validateAmount(amount);

      expect(result.isValid).toBe(false);
    });

    it('should reject negative amount', () => {
      const amount: Money = { amount: -100, currency: Currency.USD, scale: 2 };

      const result = TransactionValidator.validateAmount(amount);

      expect(result.isValid).toBe(false);
    });
  });

  describe('validateSufficientFunds', () => {
    it('should accept when balance covers amount', () => {
      const balance: Money = { amount: 1000, currency: Currency.USD, scale: 2 };
      const amount: Money = { amount: 500, currency: Currency.USD, scale: 2 };

      const result = TransactionValidator.validateSufficientFunds(balance, amount);

      expect(result.isValid).toBe(true);
    });

    it('should reject when balance is insufficient', () => {
      const balance: Money = { amount: 100, currency: Currency.USD, scale: 2 };
      const amount: Money = { amount: 500, currency: Currency.USD, scale: 2 };

      const result = TransactionValidator.validateSufficientFunds(balance, amount);

      expect(result.isValid).toBe(false);
    });

    it('should consider overdraft limit', () => {
      const balance: Money = { amount: 100, currency: Currency.USD, scale: 2 };
      const amount: Money = { amount: 500, currency: Currency.USD, scale: 2 };
      const overdraft: Money = { amount: 500, currency: Currency.USD, scale: 2 };

      const result = TransactionValidator.validateSufficientFunds(balance, amount, overdraft);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCurrency', () => {
    it('should accept matching currencies', () => {
      const result = TransactionValidator.validateCurrency(Currency.USD, Currency.USD);

      expect(result.isValid).toBe(true);
    });

    it('should reject mismatched currencies', () => {
      const result = TransactionValidator.validateCurrency(Currency.USD, Currency.EUR);

      expect(result.isValid).toBe(false);
    });
  });

  describe('validateTransfer', () => {
    it('should validate complete transfer', () => {
      const sourceAccount = createMockAccount({ id: 'source' });
      const destAccount = createMockAccount({ id: 'dest' });
      const amount: Money = { amount: 100, currency: Currency.USD, scale: 2 };
      const sourceBalance = createMockBalance({ accountId: 'source' });

      const result = TransactionValidator.validateTransfer(
        sourceAccount,
        destAccount,
        amount,
        sourceBalance
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject transfer to same account', () => {
      const account = createMockAccount({ id: 'same' });
      const amount: Money = { amount: 100, currency: Currency.USD, scale: 2 };
      const balance = createMockBalance({ accountId: 'same' });

      const result = TransactionValidator.validateTransfer(
        account,
        account,
        amount,
        balance
      );

      expect(result.isValid).toBe(false);
    });
  });

  describe('canTransitionTo', () => {
    it('should allow valid transaction status transitions', () => {
      const testCases = [
        { from: TransactionStatus.PENDING, to: TransactionStatus.PROCESSING },
        { from: TransactionStatus.PROCESSING, to: TransactionStatus.COMPLETED },
        { from: TransactionStatus.COMPLETED, to: TransactionStatus.REVERSED },
      ];

      for (const { from, to } of testCases) {
        const result = TransactionValidator.canTransitionTo(from, to);
        expect(result.isValid).toBe(true);
      }
    });

    it('should reject invalid transaction status transitions', () => {
      const testCases = [
        { from: TransactionStatus.COMPLETED, to: TransactionStatus.PENDING },
        { from: TransactionStatus.FAILED, to: TransactionStatus.COMPLETED },
        { from: TransactionStatus.REVERSED, to: TransactionStatus.COMPLETED },
      ];

      for (const { from, to } of testCases) {
        const result = TransactionValidator.canTransitionTo(from, to);
        expect(result.isValid).toBe(false);
      }
    });
  });
});

describe('combineValidationResults', () => {
  it('should combine valid results', () => {
    const result = combineValidationResults(validResult(), validResult());

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should combine with invalid results', () => {
    const error1 = new ValidationError('field1', 'error 1');
    const error2 = new ValidationError('field2', 'error 2');

    const result = combineValidationResults(
      invalidResult(error1),
      validResult(),
      invalidResult(error2)
    );

    expect(result.isValid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
