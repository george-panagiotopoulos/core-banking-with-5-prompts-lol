/**
 * Core Banking System - API Layer
 *
 * Unified API for all banking operations with proper error handling and validation
 */

import {
  Account,
  AccountStatus,
  Transaction,
  TransactionType,
  TransactionStatus,
  Balance,
  ProductConfiguration,
  Money,
  Currency,
  LedgerEntry,
  EntryType,
  AccountNumber,
  CustomerId,
  TransactionId,
} from '../core/domain';
import {
  AccountValidator,
  TransactionValidator,
  ProductValidator,
  ValidationResult,
  combineValidationResults,
} from '../core/validators';
import {
  BankingError,
  AccountNotFoundError,
  ProductNotFoundError,
  TransactionNotFoundError,
  InvalidTransactionError,
  ValidationError,
} from '../utils/errors';
import { IdGenerator } from '../utils/id-generator';

/**
 * Result type for API operations
 */
export type Result<T, E = BankingError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Create a failure result
 */
export function failure<E extends BankingError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Account creation request
 */
export interface CreateAccountRequest {
  customerId: string;
  customerType: 'INDIVIDUAL' | 'BUSINESS' | 'JOINT';
  productId: string;
  initialDeposit?: number;
  currency?: Currency;
  metadata?: Record<string, unknown>;
}

/**
 * Transfer request
 */
export interface TransferRequest {
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  currency: Currency;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
}

/**
 * Deposit request
 */
export interface DepositRequest {
  accountId: string;
  amount: number;
  currency: Currency;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
}

/**
 * Withdrawal request
 */
export interface WithdrawalRequest {
  accountId: string;
  amount: number;
  currency: Currency;
  description?: string;
  reference?: string;
  idempotencyKey?: string;
}

/**
 * Account statement request
 */
export interface StatementRequest {
  accountId: string;
  fromDate: Date;
  toDate: Date;
  format?: 'json' | 'csv';
}

/**
 * Account statement entry
 */
export interface StatementEntry {
  date: Date;
  description: string;
  reference: string | null;
  debit: number | null;
  credit: number | null;
  balance: number;
}

/**
 * Account statement response
 */
export interface AccountStatement {
  accountId: string;
  accountNumber: string;
  currency: Currency;
  openingBalance: number;
  closingBalance: number;
  fromDate: Date;
  toDate: Date;
  entries: StatementEntry[];
  totalDebits: number;
  totalCredits: number;
}

/**
 * In-memory storage for the banking API (would be replaced with actual repositories)
 */
class InMemoryStorage {
  accounts: Map<string, Account> = new Map();
  balances: Map<string, Balance> = new Map();
  transactions: Map<string, Transaction> = new Map();
  ledgerEntries: Map<string, LedgerEntry[]> = new Map();
  products: Map<string, ProductConfiguration> = new Map();
  idempotencyKeys: Map<string, string> = new Map();
  accountSequence: number = 10000000;
}

/**
 * Core Banking API
 *
 * Provides a unified interface for all banking operations
 */
export class BankingAPI {
  private storage: InMemoryStorage;

  constructor() {
    this.storage = new InMemoryStorage();
    this.initializeDefaultProducts();
  }

  /**
   * Initialize default product configurations
   */
  private initializeDefaultProducts(): void {
    const defaultProducts: ProductConfiguration[] = [
      this.createDefaultProduct('Basic Current Account', 'BASIC_ACCOUNT', 0, null),
      this.createDefaultProduct('Standard Current Account', 'CURRENT_ACCOUNT', 100, 500),
      this.createDefaultProduct('Premium Current Account', 'PREMIUM_CURRENT', 1000, 5000),
      this.createDefaultProduct('Business Current Account', 'BUSINESS_ACCOUNT', 500, 10000),
      this.createDefaultProduct('Student Account', 'STUDENT_ACCOUNT', 0, 100),
    ];

    defaultProducts.forEach((p) => this.storage.products.set(p.id, p));
  }

  private createDefaultProduct(
    name: string,
    type: string,
    minBalance: number,
    overdraft: number | null
  ): ProductConfiguration {
    const currency = Currency.USD;
    return {
      id: IdGenerator.productId(),
      name,
      type: type as any,
      currency,
      minimumBalance: { amount: minBalance, currency, scale: 2 },
      overdraftLimit: overdraft ? { amount: overdraft, currency, scale: 2 } : null,
      interestRate: 0.001,
      fees: {
        monthlyFee: { amount: type === 'PREMIUM_CURRENT' ? 25 : 0, currency, scale: 2 },
        transactionFee: null,
        overdraftFee: overdraft ? { amount: 35, currency, scale: 2 } : null,
        atmFee: null,
        foreignTransactionFeeRate: 0.03,
        minimumBalanceFee: minBalance > 0 ? { amount: 15, currency, scale: 2 } : null,
      },
      isActive: true,
      features: {
        overdraftAllowed: overdraft !== null,
        paysInterest: type === 'PREMIUM_CURRENT',
        freeTransactionsPerMonth: type === 'BASIC_ACCOUNT' ? 10 : null,
        debitCardIncluded: true,
        onlineBankingEnabled: true,
        mobileAppEnabled: true,
        additionalFeatures: [],
      },
      limits: {
        maxTransactionAmount: { amount: type === 'BUSINESS_ACCOUNT' ? 100000 : 10000, currency, scale: 2 },
        maxDailyAmount: { amount: type === 'BUSINESS_ACCOUNT' ? 500000 : 50000, currency, scale: 2 },
        maxMonthlyAmount: null,
        maxTransactionsPerDay: null,
        maxAtmWithdrawalPerDay: { amount: 1000, currency, scale: 2 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };
  }

  // ============================================================================
  // Account Operations
  // ============================================================================

  /**
   * Create a new bank account
   */
  async createAccount(request: CreateAccountRequest): Promise<Result<Account>> {
    // Validate product exists
    const product = this.storage.products.get(request.productId);
    if (!product) {
      return failure(new ProductNotFoundError(request.productId));
    }

    if (!product.isActive) {
      return failure(new ValidationError('productId', 'Product is not active'));
    }

    // Generate account number
    const accountNumber = this.generateAccountNumber();
    const accountId = IdGenerator.accountId();
    const currency = request.currency || product.currency;

    // Create account
    const account: Account = {
      id: accountId,
      accountNumber,
      customerId: {
        value: request.customerId,
        type: request.customerType,
      },
      productId: request.productId,
      status: AccountStatus.ACTIVE,
      currency,
      createdAt: new Date(),
      updatedAt: new Date(),
      closedAt: null,
      overdraftLimit: product.overdraftLimit,
      metadata: request.metadata || {},
      version: 1,
    };

    // Create initial balance
    const balance: Balance = {
      accountId,
      availableBalance: { amount: 0, currency, scale: 2 },
      ledgerBalance: { amount: 0, currency, scale: 2 },
      pendingBalance: { amount: 0, currency, scale: 2 },
      heldBalance: { amount: 0, currency, scale: 2 },
      currency,
      lastUpdatedAt: new Date(),
      lastPostingDate: new Date(),
      overdraftUsage: null,
      version: 1,
    };

    this.storage.accounts.set(accountId, account);
    this.storage.balances.set(accountId, balance);
    this.storage.ledgerEntries.set(accountId, []);

    // Process initial deposit if provided
    if (request.initialDeposit && request.initialDeposit > 0) {
      const depositResult = await this.deposit({
        accountId,
        amount: request.initialDeposit,
        currency,
        description: 'Initial deposit',
      });

      if (!depositResult.success) {
        // Rollback account creation
        this.storage.accounts.delete(accountId);
        this.storage.balances.delete(accountId);
        this.storage.ledgerEntries.delete(accountId);
        return depositResult as Result<Account>;
      }
    }

    return success(account);
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<Result<Account>> {
    const account = this.storage.accounts.get(accountId);
    if (!account) {
      return failure(new AccountNotFoundError(accountId));
    }
    return success(account);
  }

  /**
   * Get account balance
   */
  async getBalance(accountId: string): Promise<Result<Balance>> {
    const balance = this.storage.balances.get(accountId);
    if (!balance) {
      return failure(new AccountNotFoundError(accountId));
    }
    return success(balance);
  }

  /**
   * Update account status
   */
  async updateAccountStatus(
    accountId: string,
    newStatus: AccountStatus,
    reason?: string
  ): Promise<Result<Account>> {
    const account = this.storage.accounts.get(accountId);
    if (!account) {
      return failure(new AccountNotFoundError(accountId));
    }

    // Validate status transition
    const validationResult = AccountValidator.canTransitionTo(account, newStatus);
    if (!validationResult.isValid) {
      return failure(validationResult.errors[0]!);
    }

    // For closing, validate balance is zero
    if (newStatus === AccountStatus.CLOSED) {
      const balance = this.storage.balances.get(accountId)!;
      const closeValidation = AccountValidator.canClose(account, balance);
      if (!closeValidation.isValid) {
        return failure(closeValidation.errors[0]!);
      }
    }

    // Update account
    const updatedAccount: Account = {
      ...account,
      status: newStatus,
      updatedAt: new Date(),
      closedAt: newStatus === AccountStatus.CLOSED ? new Date() : account.closedAt,
    };

    this.storage.accounts.set(accountId, updatedAccount);
    return success(updatedAccount);
  }

  /**
   * Get accounts by customer ID
   */
  async getAccountsByCustomer(customerId: string): Promise<Result<Account[]>> {
    const accounts = Array.from(this.storage.accounts.values()).filter(
      (a) => a.customerId.value === customerId
    );
    return success(accounts);
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  /**
   * Process a transfer between accounts
   */
  async transfer(request: TransferRequest): Promise<Result<Transaction>> {
    // Check idempotency
    if (request.idempotencyKey) {
      const existingTxId = this.storage.idempotencyKeys.get(request.idempotencyKey);
      if (existingTxId) {
        const existingTx = this.storage.transactions.get(existingTxId);
        if (existingTx) {
          return success(existingTx);
        }
      }
    }

    // Get accounts
    const sourceAccount = this.storage.accounts.get(request.sourceAccountId);
    const destAccount = this.storage.accounts.get(request.destinationAccountId);

    if (!sourceAccount) {
      return failure(new AccountNotFoundError(request.sourceAccountId));
    }
    if (!destAccount) {
      return failure(new AccountNotFoundError(request.destinationAccountId));
    }

    const sourceBalance = this.storage.balances.get(request.sourceAccountId)!;
    const amount: Money = { amount: request.amount, currency: request.currency, scale: 2 };

    // Validate transfer
    const validation = TransactionValidator.validateTransfer(
      sourceAccount,
      destAccount,
      amount,
      sourceBalance
    );

    if (!validation.isValid) {
      return failure(validation.errors[0]!);
    }

    // Create transaction
    const transactionId = IdGenerator.transactionId();
    const transaction: Transaction = {
      id: {
        value: transactionId,
        generatedAt: new Date(),
        source: 'BANKING_API',
      },
      sourceAccountId: request.sourceAccountId,
      destinationAccountId: request.destinationAccountId,
      amount,
      currency: request.currency,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      reference: request.reference || IdGenerator.reference(),
      description: request.description || 'Transfer',
      createdAt: new Date(),
      completedAt: new Date(),
      initiatedBy: 'CUSTOMER',
      authorizationCode: null,
      fee: null,
      exchangeRate: null,
      originalTransactionId: null,
      failureReason: null,
      metadata: {},
      version: 1,
    };

    // Update balances
    this.updateBalancesForTransfer(
      request.sourceAccountId,
      request.destinationAccountId,
      amount
    );

    // Create ledger entries
    this.createLedgerEntriesForTransfer(
      request.sourceAccountId,
      request.destinationAccountId,
      transactionId,
      amount,
      request.description || 'Transfer'
    );

    // Store transaction
    this.storage.transactions.set(transactionId, transaction);

    // Store idempotency key
    if (request.idempotencyKey) {
      this.storage.idempotencyKeys.set(request.idempotencyKey, transactionId);
    }

    return success(transaction);
  }

  /**
   * Process a deposit
   */
  async deposit(request: DepositRequest): Promise<Result<Transaction>> {
    // Check idempotency
    if (request.idempotencyKey) {
      const existingTxId = this.storage.idempotencyKeys.get(request.idempotencyKey);
      if (existingTxId) {
        const existingTx = this.storage.transactions.get(existingTxId);
        if (existingTx) {
          return success(existingTx);
        }
      }
    }

    const account = this.storage.accounts.get(request.accountId);
    if (!account) {
      return failure(new AccountNotFoundError(request.accountId));
    }

    const amount: Money = { amount: request.amount, currency: request.currency, scale: 2 };

    // Validate deposit
    const validation = TransactionValidator.validateDeposit(account, amount);
    if (!validation.isValid) {
      return failure(validation.errors[0]!);
    }

    // Create transaction
    const transactionId = IdGenerator.transactionId();
    const transaction: Transaction = {
      id: {
        value: transactionId,
        generatedAt: new Date(),
        source: 'BANKING_API',
      },
      sourceAccountId: null,
      destinationAccountId: request.accountId,
      amount,
      currency: request.currency,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      reference: request.reference || IdGenerator.reference(),
      description: request.description || 'Deposit',
      createdAt: new Date(),
      completedAt: new Date(),
      initiatedBy: 'CUSTOMER',
      authorizationCode: null,
      fee: null,
      exchangeRate: null,
      originalTransactionId: null,
      failureReason: null,
      metadata: {},
      version: 1,
    };

    // Update balance
    const balance = this.storage.balances.get(request.accountId)!;
    const newBalance: Balance = {
      ...balance,
      availableBalance: {
        ...balance.availableBalance,
        amount: balance.availableBalance.amount + request.amount,
      },
      ledgerBalance: {
        ...balance.ledgerBalance,
        amount: balance.ledgerBalance.amount + request.amount,
      },
      lastUpdatedAt: new Date(),
      lastPostingDate: new Date(),
      version: balance.version + 1,
    };
    this.storage.balances.set(request.accountId, newBalance);

    // Create ledger entry
    this.createLedgerEntry(
      request.accountId,
      transactionId,
      EntryType.CREDIT,
      amount,
      newBalance.ledgerBalance,
      request.description || 'Deposit'
    );

    // Store transaction
    this.storage.transactions.set(transactionId, transaction);

    if (request.idempotencyKey) {
      this.storage.idempotencyKeys.set(request.idempotencyKey, transactionId);
    }

    return success(transaction);
  }

  /**
   * Process a withdrawal
   */
  async withdraw(request: WithdrawalRequest): Promise<Result<Transaction>> {
    // Check idempotency
    if (request.idempotencyKey) {
      const existingTxId = this.storage.idempotencyKeys.get(request.idempotencyKey);
      if (existingTxId) {
        const existingTx = this.storage.transactions.get(existingTxId);
        if (existingTx) {
          return success(existingTx);
        }
      }
    }

    const account = this.storage.accounts.get(request.accountId);
    if (!account) {
      return failure(new AccountNotFoundError(request.accountId));
    }

    const balance = this.storage.balances.get(request.accountId)!;
    const amount: Money = { amount: request.amount, currency: request.currency, scale: 2 };

    // Validate withdrawal
    const validation = TransactionValidator.validateWithdrawal(account, amount, balance);
    if (!validation.isValid) {
      return failure(validation.errors[0]!);
    }

    // Create transaction
    const transactionId = IdGenerator.transactionId();
    const transaction: Transaction = {
      id: {
        value: transactionId,
        generatedAt: new Date(),
        source: 'BANKING_API',
      },
      sourceAccountId: request.accountId,
      destinationAccountId: null,
      amount,
      currency: request.currency,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.COMPLETED,
      reference: request.reference || IdGenerator.reference(),
      description: request.description || 'Withdrawal',
      createdAt: new Date(),
      completedAt: new Date(),
      initiatedBy: 'CUSTOMER',
      authorizationCode: null,
      fee: null,
      exchangeRate: null,
      originalTransactionId: null,
      failureReason: null,
      metadata: {},
      version: 1,
    };

    // Update balance
    const newBalance: Balance = {
      ...balance,
      availableBalance: {
        ...balance.availableBalance,
        amount: balance.availableBalance.amount - request.amount,
      },
      ledgerBalance: {
        ...balance.ledgerBalance,
        amount: balance.ledgerBalance.amount - request.amount,
      },
      lastUpdatedAt: new Date(),
      lastPostingDate: new Date(),
      version: balance.version + 1,
    };
    this.storage.balances.set(request.accountId, newBalance);

    // Create ledger entry
    this.createLedgerEntry(
      request.accountId,
      transactionId,
      EntryType.DEBIT,
      amount,
      newBalance.ledgerBalance,
      request.description || 'Withdrawal'
    );

    // Store transaction
    this.storage.transactions.set(transactionId, transaction);

    if (request.idempotencyKey) {
      this.storage.idempotencyKeys.set(request.idempotencyKey, transactionId);
    }

    return success(transaction);
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<Result<Transaction>> {
    const transaction = this.storage.transactions.get(transactionId);
    if (!transaction) {
      return failure(new TransactionNotFoundError(transactionId));
    }
    return success(transaction);
  }

  /**
   * Get transactions for an account
   */
  async getTransactions(
    accountId: string,
    limit: number = 50
  ): Promise<Result<Transaction[]>> {
    const account = this.storage.accounts.get(accountId);
    if (!account) {
      return failure(new AccountNotFoundError(accountId));
    }

    const transactions = Array.from(this.storage.transactions.values())
      .filter(
        (t) =>
          t.sourceAccountId === accountId || t.destinationAccountId === accountId
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return success(transactions);
  }

  /**
   * Get account statement
   */
  async getStatement(request: StatementRequest): Promise<Result<AccountStatement>> {
    const account = this.storage.accounts.get(request.accountId);
    if (!account) {
      return failure(new AccountNotFoundError(request.accountId));
    }

    const entries = this.storage.ledgerEntries.get(request.accountId) || [];
    const filteredEntries = entries.filter(
      (e) => e.createdAt >= request.fromDate && e.createdAt <= request.toDate
    );

    // Calculate opening balance
    const entriesBefore = entries.filter((e) => e.createdAt < request.fromDate);
    const openingBalance =
      entriesBefore.length > 0
        ? entriesBefore[entriesBefore.length - 1]!.balance.amount
        : 0;

    // Build statement entries
    let runningBalance = openingBalance;
    const statementEntries: StatementEntry[] = filteredEntries.map((e) => {
      const isDebit = e.entryType === EntryType.DEBIT;
      runningBalance = e.balance.amount;
      return {
        date: e.createdAt,
        description: e.description,
        reference: null,
        debit: isDebit ? e.amount.amount : null,
        credit: !isDebit ? e.amount.amount : null,
        balance: runningBalance,
      };
    });

    const totalDebits = filteredEntries
      .filter((e) => e.entryType === EntryType.DEBIT)
      .reduce((sum, e) => sum + e.amount.amount, 0);

    const totalCredits = filteredEntries
      .filter((e) => e.entryType === EntryType.CREDIT)
      .reduce((sum, e) => sum + e.amount.amount, 0);

    const statement: AccountStatement = {
      accountId: request.accountId,
      accountNumber: account.accountNumber.value,
      currency: account.currency,
      openingBalance,
      closingBalance: runningBalance,
      fromDate: request.fromDate,
      toDate: request.toDate,
      entries: statementEntries,
      totalDebits,
      totalCredits,
    };

    return success(statement);
  }

  // ============================================================================
  // Product Operations
  // ============================================================================

  /**
   * Get all products
   */
  async getProducts(): Promise<Result<ProductConfiguration[]>> {
    const products = Array.from(this.storage.products.values());
    return success(products);
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string): Promise<Result<ProductConfiguration>> {
    const product = this.storage.products.get(productId);
    if (!product) {
      return failure(new ProductNotFoundError(productId));
    }
    return success(product);
  }

  /**
   * Create a new product
   */
  async createProduct(
    config: Omit<ProductConfiguration, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<Result<ProductConfiguration>> {
    const validation = ProductValidator.validateConfiguration(config);
    if (!validation.isValid) {
      return failure(validation.errors[0]!);
    }

    const product: ProductConfiguration = {
      ...config,
      id: IdGenerator.productId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    };

    this.storage.products.set(product.id, product);
    return success(product);
  }

  /**
   * Update product status
   */
  async updateProductStatus(
    productId: string,
    isActive: boolean
  ): Promise<Result<ProductConfiguration>> {
    const product = this.storage.products.get(productId);
    if (!product) {
      return failure(new ProductNotFoundError(productId));
    }

    const updatedProduct: ProductConfiguration = {
      ...product,
      isActive,
      updatedAt: new Date(),
    };

    this.storage.products.set(productId, updatedProduct);
    return success(updatedProduct);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateAccountNumber(): AccountNumber {
    this.storage.accountSequence++;
    const sequence = this.storage.accountSequence.toString().padStart(8, '0');
    const bankCode = '01';
    const branchCode = '000001';
    const checkDigit = this.calculateCheckDigit(`${bankCode}${branchCode}${sequence}`);

    return {
      value: `${bankCode}${branchCode}${sequence}${checkDigit}`,
      bankCode,
      branchCode,
      accountSequence: sequence,
      checkDigit,
    };
  }

  private calculateCheckDigit(number: string): string {
    const sum = number
      .split('')
      .map(Number)
      .reduce((acc, digit, index) => {
        const weight = index % 2 === 0 ? 1 : 2;
        const product = digit * weight;
        return acc + (product > 9 ? product - 9 : product);
      }, 0);
    return ((10 - (sum % 10)) % 10).toString().padStart(2, '0');
  }

  private updateBalancesForTransfer(
    sourceAccountId: string,
    destAccountId: string,
    amount: Money
  ): void {
    const sourceBalance = this.storage.balances.get(sourceAccountId)!;
    const destBalance = this.storage.balances.get(destAccountId)!;

    // Debit source
    const newSourceBalance: Balance = {
      ...sourceBalance,
      availableBalance: {
        ...sourceBalance.availableBalance,
        amount: sourceBalance.availableBalance.amount - amount.amount,
      },
      ledgerBalance: {
        ...sourceBalance.ledgerBalance,
        amount: sourceBalance.ledgerBalance.amount - amount.amount,
      },
      lastUpdatedAt: new Date(),
      lastPostingDate: new Date(),
      version: sourceBalance.version + 1,
    };

    // Credit destination
    const newDestBalance: Balance = {
      ...destBalance,
      availableBalance: {
        ...destBalance.availableBalance,
        amount: destBalance.availableBalance.amount + amount.amount,
      },
      ledgerBalance: {
        ...destBalance.ledgerBalance,
        amount: destBalance.ledgerBalance.amount + amount.amount,
      },
      lastUpdatedAt: new Date(),
      lastPostingDate: new Date(),
      version: destBalance.version + 1,
    };

    this.storage.balances.set(sourceAccountId, newSourceBalance);
    this.storage.balances.set(destAccountId, newDestBalance);
  }

  private createLedgerEntriesForTransfer(
    sourceAccountId: string,
    destAccountId: string,
    transactionId: string,
    amount: Money,
    description: string
  ): void {
    const sourceBalance = this.storage.balances.get(sourceAccountId)!;
    const destBalance = this.storage.balances.get(destAccountId)!;

    // Debit entry for source
    this.createLedgerEntry(
      sourceAccountId,
      transactionId,
      EntryType.DEBIT,
      amount,
      sourceBalance.ledgerBalance,
      `${description} - To ${destAccountId}`
    );

    // Credit entry for destination
    this.createLedgerEntry(
      destAccountId,
      transactionId,
      EntryType.CREDIT,
      amount,
      destBalance.ledgerBalance,
      `${description} - From ${sourceAccountId}`
    );
  }

  private createLedgerEntry(
    accountId: string,
    transactionId: string,
    entryType: EntryType,
    amount: Money,
    balanceAfter: Money,
    description: string
  ): void {
    const entries = this.storage.ledgerEntries.get(accountId) || [];
    const sequenceNumber = entries.length + 1;

    const entry: LedgerEntry = {
      id: IdGenerator.ledgerEntryId(),
      accountId,
      transactionId,
      entryType,
      amount,
      balance: balanceAfter,
      createdAt: new Date(),
      sequenceNumber,
      relatedEntryId: null,
      description,
      postingDate: new Date(),
      valueDate: new Date(),
    };

    entries.push(entry);
    this.storage.ledgerEntries.set(accountId, entries);
  }
}

/**
 * Export singleton instance
 */
export const bankingAPI = new BankingAPI();
