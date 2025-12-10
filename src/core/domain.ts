/**
 * Core Banking System - Domain Model
 *
 * This module defines the domain entities, value objects, and enums for a current account banking system.
 * It follows Domain-Driven Design principles with strict typing and immutability where appropriate.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * Account lifecycle status
 */
export enum AccountStatus {
  /** Account is pending activation */
  PENDING = 'PENDING',
  /** Account is active and operational */
  ACTIVE = 'ACTIVE',
  /** Account is temporarily suspended */
  SUSPENDED = 'SUSPENDED',
  /** Account is frozen (no transactions allowed) */
  FROZEN = 'FROZEN',
  /** Account is closed and cannot be reopened */
  CLOSED = 'CLOSED',
  /** Account is dormant (inactive for extended period) */
  DORMANT = 'DORMANT'
}

/**
 * Transaction type classification
 */
export enum TransactionType {
  /** Transfer between accounts */
  TRANSFER = 'TRANSFER',
  /** Cash deposit to account */
  DEPOSIT = 'DEPOSIT',
  /** Cash withdrawal from account */
  WITHDRAWAL = 'WITHDRAWAL',
  /** Payment to external party */
  PAYMENT = 'PAYMENT',
  /** Automated payment instruction */
  DIRECT_DEBIT = 'DIRECT_DEBIT',
  /** Automated credit instruction */
  STANDING_ORDER = 'STANDING_ORDER',
  /** Fee charged to account */
  FEE = 'FEE',
  /** Interest credited to account */
  INTEREST = 'INTEREST',
  /** Reversal of previous transaction */
  REVERSAL = 'REVERSAL',
  /** Adjustment by bank */
  ADJUSTMENT = 'ADJUSTMENT'
}

/**
 * Transaction processing status
 */
export enum TransactionStatus {
  /** Transaction is being validated */
  PENDING = 'PENDING',
  /** Transaction is being processed */
  PROCESSING = 'PROCESSING',
  /** Transaction completed successfully */
  COMPLETED = 'COMPLETED',
  /** Transaction failed validation or processing */
  FAILED = 'FAILED',
  /** Transaction was reversed */
  REVERSED = 'REVERSED',
  /** Transaction was rejected (fraud, insufficient funds, etc.) */
  REJECTED = 'REJECTED',
  /** Transaction is on hold pending review */
  ON_HOLD = 'ON_HOLD'
}

/**
 * Ledger entry type (double-entry bookkeeping)
 */
export enum EntryType {
  /** Debit entry (money out) */
  DEBIT = 'DEBIT',
  /** Credit entry (money in) */
  CREDIT = 'CREDIT'
}

/**
 * Product type classification
 */
export enum ProductType {
  /** Standard current account */
  CURRENT_ACCOUNT = 'CURRENT_ACCOUNT',
  /** Premium current account with benefits */
  PREMIUM_CURRENT = 'PREMIUM_CURRENT',
  /** Basic account with limited features */
  BASIC_ACCOUNT = 'BASIC_ACCOUNT',
  /** Business current account */
  BUSINESS_ACCOUNT = 'BUSINESS_ACCOUNT',
  /** Student account */
  STUDENT_ACCOUNT = 'STUDENT_ACCOUNT'
}

/**
 * ISO 4217 Currency codes (subset)
 */
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  JPY = 'JPY',
  CHF = 'CHF',
  AUD = 'AUD',
  CAD = 'CAD'
}

// ============================================================================
// Value Objects
// ============================================================================

/**
 * Money value object - represents monetary amount with currency
 * Immutable and always valid
 */
export interface Money {
  /** Amount in smallest currency unit (cents for USD/EUR/GBP) */
  readonly amount: number;
  /** ISO 4217 currency code */
  readonly currency: Currency;
  /** Decimal places for currency (2 for most, 0 for JPY) */
  readonly scale: number;
}

/**
 * Account number value object with validation rules
 * Format: 2-digit bank code + 6-digit branch code + 8-digit account number
 */
export interface AccountNumber {
  /** Full account number (16 digits) */
  readonly value: string;
  /** Bank identifier code (2 digits) */
  readonly bankCode: string;
  /** Branch identifier code (6 digits) */
  readonly branchCode: string;
  /** Account sequence number (8 digits) */
  readonly accountSequence: string;
  /** Check digit for validation */
  readonly checkDigit: string;
}

/**
 * Transaction identifier value object
 * Globally unique transaction reference
 */
export interface TransactionId {
  /** Unique transaction identifier (UUID v4) */
  readonly value: string;
  /** Timestamp when ID was generated */
  readonly generatedAt: Date;
  /** Source system that generated the ID */
  readonly source: string;
}

/**
 * Customer identifier value object
 */
export interface CustomerId {
  /** Unique customer identifier */
  readonly value: string;
  /** Customer type (individual, business, etc.) */
  readonly type: 'INDIVIDUAL' | 'BUSINESS' | 'JOINT';
}

// ============================================================================
// Domain Entities
// ============================================================================

/**
 * Account aggregate root
 * Represents a customer's bank account with full lifecycle management
 */
export interface Account {
  /** Unique account identifier (UUID) */
  readonly id: string;

  /** Account number (value object) */
  readonly accountNumber: AccountNumber;

  /** Customer who owns this account */
  readonly customerId: CustomerId;

  /** Product configuration this account is based on */
  readonly productId: string;

  /** Current account status */
  status: AccountStatus;

  /** Account currency */
  readonly currency: Currency;

  /** Account opening date */
  readonly createdAt: Date;

  /** Last modification date */
  updatedAt: Date;

  /** Date account was closed (null if active) */
  readonly closedAt: Date | null;

  /** Current overdraft limit (null if not applicable) */
  overdraftLimit: Money | null;

  /** Account metadata and tags */
  readonly metadata: Record<string, unknown>;

  /** Version for optimistic locking */
  readonly version: number;
}

/**
 * Ledger entry entity
 * Immutable record of a single accounting entry (double-entry bookkeeping)
 */
export interface LedgerEntry {
  /** Unique ledger entry identifier (UUID) */
  readonly id: string;

  /** Account this entry belongs to */
  readonly accountId: string;

  /** Transaction that created this entry */
  readonly transactionId: string;

  /** Entry type (debit or credit) */
  readonly entryType: EntryType;

  /** Amount of this entry */
  readonly amount: Money;

  /** Running balance after this entry */
  readonly balance: Money;

  /** Entry creation timestamp (immutable) */
  readonly createdAt: Date;

  /** Entry sequence number for ordering */
  readonly sequenceNumber: number;

  /** Reference to related entry (for transfers) */
  readonly relatedEntryId: string | null;

  /** Entry description or narrative */
  readonly description: string;

  /** Posting date (may differ from createdAt for backdated entries) */
  readonly postingDate: Date;

  /** Value date (when funds become available) */
  readonly valueDate: Date;
}

/**
 * Transaction entity
 * Represents a financial transaction between accounts or with external parties
 */
export interface Transaction {
  /** Unique transaction identifier (value object) */
  readonly id: TransactionId;

  /** Source account (null for deposits from external sources) */
  readonly sourceAccountId: string | null;

  /** Destination account (null for withdrawals to external parties) */
  readonly destinationAccountId: string | null;

  /** Transaction amount */
  readonly amount: Money;

  /** Transaction currency (may differ from account currency for FX) */
  readonly currency: Currency;

  /** Transaction type classification */
  readonly type: TransactionType;

  /** Current transaction status */
  status: TransactionStatus;

  /** External reference number (from payment system, etc.) */
  readonly reference: string | null;

  /** Human-readable description */
  readonly description: string;

  /** Transaction initiation timestamp */
  readonly createdAt: Date;

  /** Transaction completion timestamp */
  readonly completedAt: Date | null;

  /** Initiating user or system */
  readonly initiatedBy: string;

  /** Authorization code (if applicable) */
  readonly authorizationCode: string | null;

  /** Fee charged for this transaction */
  readonly fee: Money | null;

  /** Exchange rate (for FX transactions) */
  readonly exchangeRate: number | null;

  /** Original transaction ID (for reversals) */
  readonly originalTransactionId: string | null;

  /** Failure reason (if status is FAILED or REJECTED) */
  readonly failureReason: string | null;

  /** Additional transaction metadata */
  readonly metadata: Record<string, unknown>;

  /** Version for optimistic locking */
  readonly version: number;
}

/**
 * Balance entity
 * Represents current balance state of an account with different balance types
 */
export interface Balance {
  /** Account this balance belongs to */
  readonly accountId: string;

  /** Available balance (can be used immediately) */
  readonly availableBalance: Money;

  /** Ledger balance (actual cleared balance) */
  readonly ledgerBalance: Money;

  /** Pending balance (transactions being processed) */
  readonly pendingBalance: Money;

  /** Held balance (frozen for specific purposes) */
  readonly heldBalance: Money;

  /** Balance currency */
  readonly currency: Currency;

  /** Timestamp of last balance update */
  readonly lastUpdatedAt: Date;

  /** Date of last ledger posting */
  readonly lastPostingDate: Date;

  /** Current overdraft usage (if applicable) */
  readonly overdraftUsage: Money | null;

  /** Version for optimistic locking */
  readonly version: number;
}

/**
 * Product configuration entity
 * Defines the features and rules for an account product
 */
export interface ProductConfiguration {
  /** Unique product identifier (UUID) */
  readonly id: string;

  /** Product name */
  readonly name: string;

  /** Product type classification */
  readonly type: ProductType;

  /** Product currency */
  readonly currency: Currency;

  /** Minimum balance requirement */
  readonly minimumBalance: Money;

  /** Maximum overdraft limit allowed */
  readonly overdraftLimit: Money | null;

  /** Annual interest rate (percentage, e.g., 0.05 for 5%) */
  readonly interestRate: number;

  /** Fee structure for this product */
  readonly fees: ProductFees;

  /** Whether product is currently offered */
  isActive: boolean;

  /** Product features and benefits */
  readonly features: ProductFeatures;

  /** Transaction limits */
  readonly limits: TransactionLimits;

  /** Product creation date */
  readonly createdAt: Date;

  /** Last modification date */
  updatedAt: Date;

  /** Product version */
  readonly version: number;
}

/**
 * Product fees structure
 */
export interface ProductFees {
  /** Monthly maintenance fee */
  readonly monthlyFee: Money | null;

  /** Fee per transaction (if applicable) */
  readonly transactionFee: Money | null;

  /** Overdraft usage fee */
  readonly overdraftFee: Money | null;

  /** ATM withdrawal fee */
  readonly atmFee: Money | null;

  /** Foreign transaction fee (percentage) */
  readonly foreignTransactionFeeRate: number | null;

  /** Minimum balance fee (charged if below minimum) */
  readonly minimumBalanceFee: Money | null;
}

/**
 * Product features
 */
export interface ProductFeatures {
  /** Whether overdraft is allowed */
  readonly overdraftAllowed: boolean;

  /** Whether interest is paid on balance */
  readonly paysInterest: boolean;

  /** Number of free transactions per month */
  readonly freeTransactionsPerMonth: number | null;

  /** Whether account has a debit card */
  readonly debitCardIncluded: boolean;

  /** Whether online banking is available */
  readonly onlineBankingEnabled: boolean;

  /** Whether mobile app is available */
  readonly mobileAppEnabled: boolean;

  /** Additional features list */
  readonly additionalFeatures: string[];
}

/**
 * Transaction limits
 */
export interface TransactionLimits {
  /** Maximum single transaction amount */
  readonly maxTransactionAmount: Money;

  /** Maximum daily transaction total */
  readonly maxDailyAmount: Money;

  /** Maximum monthly transaction total */
  readonly maxMonthlyAmount: Money | null;

  /** Maximum number of transactions per day */
  readonly maxTransactionsPerDay: number | null;

  /** Maximum ATM withdrawal per day */
  readonly maxAtmWithdrawalPerDay: Money | null;
}

// ============================================================================
// Domain Events
// ============================================================================

/**
 * Base domain event interface
 */
export interface DomainEvent {
  /** Event identifier */
  readonly eventId: string;

  /** Event type */
  readonly eventType: string;

  /** Aggregate ID this event relates to */
  readonly aggregateId: string;

  /** Event timestamp */
  readonly occurredAt: Date;

  /** Event version */
  readonly version: number;

  /** Event metadata */
  readonly metadata: Record<string, unknown>;
}

/**
 * Account opened event
 */
export interface AccountOpenedEvent extends DomainEvent {
  readonly eventType: 'ACCOUNT_OPENED';
  readonly accountNumber: AccountNumber;
  readonly customerId: CustomerId;
  readonly productId: string;
  readonly currency: Currency;
}

/**
 * Transaction completed event
 */
export interface TransactionCompletedEvent extends DomainEvent {
  readonly eventType: 'TRANSACTION_COMPLETED';
  readonly transactionId: string;
  readonly sourceAccountId: string | null;
  readonly destinationAccountId: string | null;
  readonly amount: Money;
  readonly type: TransactionType;
}

/**
 * Balance updated event
 */
export interface BalanceUpdatedEvent extends DomainEvent {
  readonly eventType: 'BALANCE_UPDATED';
  readonly accountId: string;
  readonly previousBalance: Money;
  readonly newBalance: Money;
  readonly reason: string;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * Account repository interface
 */
export interface AccountRepository {
  findById(id: string): Promise<Account | null>;
  findByAccountNumber(accountNumber: AccountNumber): Promise<Account | null>;
  findByCustomerId(customerId: CustomerId): Promise<Account[]>;
  save(account: Account): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Transaction repository interface
 */
export interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByAccountId(accountId: string, limit?: number): Promise<Transaction[]>;
  findByDateRange(accountId: string, startDate: Date, endDate: Date): Promise<Transaction[]>;
  save(transaction: Transaction): Promise<void>;
}

/**
 * Ledger repository interface
 */
export interface LedgerRepository {
  findById(id: string): Promise<LedgerEntry | null>;
  findByAccountId(accountId: string, limit?: number): Promise<LedgerEntry[]>;
  findByTransactionId(transactionId: string): Promise<LedgerEntry[]>;
  save(entry: LedgerEntry): Promise<void>;
  getAccountBalance(accountId: string): Promise<Money>;
}

/**
 * Balance repository interface
 */
export interface BalanceRepository {
  findByAccountId(accountId: string): Promise<Balance | null>;
  save(balance: Balance): Promise<void>;
  updateAvailableBalance(accountId: string, amount: Money): Promise<void>;
}

/**
 * Product repository interface
 */
export interface ProductRepository {
  findById(id: string): Promise<ProductConfiguration | null>;
  findByType(type: ProductType): Promise<ProductConfiguration[]>;
  findActive(): Promise<ProductConfiguration[]>;
  save(product: ProductConfiguration): Promise<void>;
}
