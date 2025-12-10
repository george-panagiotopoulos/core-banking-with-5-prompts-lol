/**
 * Core Banking System - Integration Tests
 *
 * Tests for the Banking API covering accounts, transactions, and balances
 */

import {
  BankingAPI,
  CreateAccountRequest,
  TransferRequest,
  DepositRequest,
  WithdrawalRequest,
} from '../src/api/banking-api';
import { Currency, AccountStatus, TransactionType, TransactionStatus } from '../src/core/domain';

describe('BankingAPI', () => {
  let api: BankingAPI;

  beforeEach(() => {
    api = new BankingAPI();
  });

  describe('Product Management', () => {
    it('should have default products available', async () => {
      const result = await api.getProducts();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(0);
        expect(result.data.some((p) => p.name === 'Basic Current Account')).toBe(true);
        expect(result.data.some((p) => p.name === 'Standard Current Account')).toBe(true);
        expect(result.data.some((p) => p.name === 'Premium Current Account')).toBe(true);
      }
    });

    it('should get product by ID', async () => {
      const productsResult = await api.getProducts();
      expect(productsResult.success).toBe(true);

      if (productsResult.success && productsResult.data.length > 0) {
        const productId = productsResult.data[0]!.id;
        const result = await api.getProduct(productId);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(productId);
        }
      }
    });

    it('should return error for non-existent product', async () => {
      const result = await api.getProduct('non-existent-id');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PRODUCT_NOT_FOUND');
      }
    });
  });

  describe('Account Creation', () => {
    it('should create a new account with initial deposit', async () => {
      const productsResult = await api.getProducts();
      expect(productsResult.success).toBe(true);

      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const request: CreateAccountRequest = {
          customerId: 'cust-001',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          initialDeposit: 1000,
          currency: Currency.USD,
        };

        const result = await api.createAccount(request);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.customerId.value).toBe('cust-001');
          expect(result.data.productId).toBe(product.id);
          expect(result.data.status).toBe(AccountStatus.ACTIVE);
          expect(result.data.currency).toBe(Currency.USD);
          expect(result.data.accountNumber.value).toBeDefined();
        }
      }
    });

    it('should create account without initial deposit', async () => {
      const productsResult = await api.getProducts();
      expect(productsResult.success).toBe(true);

      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const request: CreateAccountRequest = {
          customerId: 'cust-002',
          customerType: 'BUSINESS',
          productId: product.id,
        };

        const result = await api.createAccount(request);

        expect(result.success).toBe(true);
        if (result.success) {
          const balanceResult = await api.getBalance(result.data.id);
          expect(balanceResult.success).toBe(true);
          if (balanceResult.success) {
            expect(balanceResult.data.availableBalance.amount).toBe(0);
          }
        }
      }
    });

    it('should fail with invalid product ID', async () => {
      const request: CreateAccountRequest = {
        customerId: 'cust-003',
        customerType: 'INDIVIDUAL',
        productId: 'invalid-product-id',
      };

      const result = await api.createAccount(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PRODUCT_NOT_FOUND');
      }
    });
  });

  describe('Balance Operations', () => {
    let accountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const accountResult = await api.createAccount({
          customerId: 'cust-balance-test',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          initialDeposit: 5000,
          currency: Currency.USD,
        });
        if (accountResult.success) {
          accountId = accountResult.data.id;
        }
      }
    });

    it('should get account balance', async () => {
      const result = await api.getBalance(accountId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.availableBalance.amount).toBe(5000);
        expect(result.data.ledgerBalance.amount).toBe(5000);
        expect(result.data.pendingBalance.amount).toBe(0);
        expect(result.data.heldBalance.amount).toBe(0);
      }
    });

    it('should return error for non-existent account', async () => {
      const result = await api.getBalance('non-existent-account');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('ACCOUNT_NOT_FOUND');
      }
    });
  });

  describe('Deposit Operations', () => {
    let accountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const accountResult = await api.createAccount({
          customerId: 'cust-deposit-test',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          currency: Currency.USD,
        });
        if (accountResult.success) {
          accountId = accountResult.data.id;
        }
      }
    });

    it('should deposit funds successfully', async () => {
      const request: DepositRequest = {
        accountId,
        amount: 500,
        currency: Currency.USD,
        description: 'Test deposit',
      };

      const result = await api.deposit(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(TransactionType.DEPOSIT);
        expect(result.data.status).toBe(TransactionStatus.COMPLETED);
        expect(result.data.amount.amount).toBe(500);

        // Verify balance updated
        const balanceResult = await api.getBalance(accountId);
        expect(balanceResult.success).toBe(true);
        if (balanceResult.success) {
          expect(balanceResult.data.availableBalance.amount).toBe(500);
        }
      }
    });

    it('should handle idempotent deposits', async () => {
      const idempotencyKey = 'unique-deposit-key';
      const request: DepositRequest = {
        accountId,
        amount: 100,
        currency: Currency.USD,
        idempotencyKey,
      };

      // First deposit
      const result1 = await api.deposit(request);
      expect(result1.success).toBe(true);

      // Duplicate deposit with same idempotency key
      const result2 = await api.deposit(request);
      expect(result2.success).toBe(true);

      // Should return same transaction
      if (result1.success && result2.success) {
        expect(result1.data.id.value).toBe(result2.data.id.value);
      }

      // Balance should only reflect one deposit
      const balanceResult = await api.getBalance(accountId);
      if (balanceResult.success) {
        expect(balanceResult.data.availableBalance.amount).toBe(100);
      }
    });
  });

  describe('Withdrawal Operations', () => {
    let accountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const accountResult = await api.createAccount({
          customerId: 'cust-withdrawal-test',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          initialDeposit: 1000,
          currency: Currency.USD,
        });
        if (accountResult.success) {
          accountId = accountResult.data.id;
        }
      }
    });

    it('should withdraw funds successfully', async () => {
      const request: WithdrawalRequest = {
        accountId,
        amount: 300,
        currency: Currency.USD,
        description: 'Test withdrawal',
      };

      const result = await api.withdraw(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(TransactionType.WITHDRAWAL);
        expect(result.data.status).toBe(TransactionStatus.COMPLETED);
        expect(result.data.amount.amount).toBe(300);

        // Verify balance updated
        const balanceResult = await api.getBalance(accountId);
        expect(balanceResult.success).toBe(true);
        if (balanceResult.success) {
          expect(balanceResult.data.availableBalance.amount).toBe(700);
        }
      }
    });

    it('should fail withdrawal with insufficient funds', async () => {
      const request: WithdrawalRequest = {
        accountId,
        amount: 2000, // More than available balance
        currency: Currency.USD,
      };

      const result = await api.withdraw(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('Insufficient funds');
      }
    });
  });

  describe('Transfer Operations', () => {
    let sourceAccountId: string;
    let destAccountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;

        // Create source account with balance
        const sourceResult = await api.createAccount({
          customerId: 'cust-source',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          initialDeposit: 5000,
          currency: Currency.USD,
        });

        // Create destination account
        const destResult = await api.createAccount({
          customerId: 'cust-dest',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          currency: Currency.USD,
        });

        if (sourceResult.success && destResult.success) {
          sourceAccountId = sourceResult.data.id;
          destAccountId = destResult.data.id;
        }
      }
    });

    it('should transfer funds between accounts', async () => {
      const request: TransferRequest = {
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 1000,
        currency: Currency.USD,
        description: 'Test transfer',
      };

      const result = await api.transfer(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(TransactionType.TRANSFER);
        expect(result.data.status).toBe(TransactionStatus.COMPLETED);
        expect(result.data.sourceAccountId).toBe(sourceAccountId);
        expect(result.data.destinationAccountId).toBe(destAccountId);

        // Verify source balance decreased
        const sourceBalance = await api.getBalance(sourceAccountId);
        expect(sourceBalance.success).toBe(true);
        if (sourceBalance.success) {
          expect(sourceBalance.data.availableBalance.amount).toBe(4000);
        }

        // Verify destination balance increased
        const destBalance = await api.getBalance(destAccountId);
        expect(destBalance.success).toBe(true);
        if (destBalance.success) {
          expect(destBalance.data.availableBalance.amount).toBe(1000);
        }
      }
    });

    it('should fail transfer with insufficient funds', async () => {
      const request: TransferRequest = {
        sourceAccountId,
        destinationAccountId: destAccountId,
        amount: 10000, // More than available
        currency: Currency.USD,
      };

      const result = await api.transfer(request);

      expect(result.success).toBe(false);
    });

    it('should fail transfer to same account', async () => {
      const request: TransferRequest = {
        sourceAccountId,
        destinationAccountId: sourceAccountId, // Same account
        amount: 100,
        currency: Currency.USD,
      };

      const result = await api.transfer(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('same account');
      }
    });
  });

  describe('Account Statement', () => {
    let accountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const accountResult = await api.createAccount({
          customerId: 'cust-statement-test',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          initialDeposit: 1000,
          currency: Currency.USD,
        });
        if (accountResult.success) {
          accountId = accountResult.data.id;

          // Add some transactions
          await api.deposit({ accountId, amount: 500, currency: Currency.USD });
          await api.withdraw({ accountId, amount: 200, currency: Currency.USD });
          await api.deposit({ accountId, amount: 300, currency: Currency.USD });
        }
      }
    });

    it('should generate account statement', async () => {
      const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const toDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now

      const result = await api.getStatement({
        accountId,
        fromDate,
        toDate,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accountId).toBe(accountId);
        expect(result.data.entries.length).toBeGreaterThan(0);
        expect(result.data.closingBalance).toBe(1600); // 1000 + 500 - 200 + 300
        expect(result.data.totalCredits).toBeGreaterThan(0);
        expect(result.data.totalDebits).toBeGreaterThan(0);
      }
    });
  });

  describe('Account Status Management', () => {
    let accountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const accountResult = await api.createAccount({
          customerId: 'cust-status-test',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          currency: Currency.USD,
        });
        if (accountResult.success) {
          accountId = accountResult.data.id;
        }
      }
    });

    it('should suspend an active account', async () => {
      const result = await api.updateAccountStatus(accountId, AccountStatus.SUSPENDED);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(AccountStatus.SUSPENDED);
      }
    });

    it('should not allow transactions on suspended account', async () => {
      // Suspend account
      await api.updateAccountStatus(accountId, AccountStatus.SUSPENDED);

      // Try to deposit
      const depositResult = await api.deposit({
        accountId,
        amount: 100,
        currency: Currency.USD,
      });

      expect(depositResult.success).toBe(false);
    });

    it('should close account with zero balance', async () => {
      const result = await api.updateAccountStatus(accountId, AccountStatus.CLOSED);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe(AccountStatus.CLOSED);
      }
    });
  });

  describe('Transaction History', () => {
    let accountId: string;

    beforeEach(async () => {
      const productsResult = await api.getProducts();
      if (productsResult.success) {
        const product = productsResult.data[0]!;
        const accountResult = await api.createAccount({
          customerId: 'cust-history-test',
          customerType: 'INDIVIDUAL',
          productId: product.id,
          initialDeposit: 1000,
          currency: Currency.USD,
        });
        if (accountResult.success) {
          accountId = accountResult.data.id;
        }
      }
    });

    it('should retrieve transaction history', async () => {
      // Add some transactions
      await api.deposit({ accountId, amount: 100, currency: Currency.USD });
      await api.withdraw({ accountId, amount: 50, currency: Currency.USD });

      const result = await api.getTransactions(accountId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should limit transaction history results', async () => {
      // Add multiple transactions
      for (let i = 0; i < 5; i++) {
        await api.deposit({ accountId, amount: 10, currency: Currency.USD });
      }

      const result = await api.getTransactions(accountId, 3);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeLessThanOrEqual(3);
      }
    });
  });
});
