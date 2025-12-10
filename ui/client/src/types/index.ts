// Enums
export enum AccountStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
  DORMANT = 'DORMANT'
}

export enum TransactionType {
  TRANSFER = 'TRANSFER',
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  PAYMENT = 'PAYMENT',
  FEE = 'FEE',
  INTEREST = 'INTEREST'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED'
}

export enum EntryType {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT'
}

// Interfaces
export interface Account {
  id: string;
  accountNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  status: AccountStatus;
  currency: string;
  balance: number;
  availableBalance: number;
  overdraftLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  sourceAccountId: string | null;
  sourceAccountNumber: string | null;
  destinationAccountId: string | null;
  destinationAccountNumber: string | null;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  accountNumber: string;
  entryType: EntryType;
  amount: number;
  balance: number;
  currency: string;
  description: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  currency: string;
  minimumBalance: number;
  overdraftLimit: number;
  interestRate: number;
  monthlyFee: number;
  isActive: boolean;
}

export interface DashboardSummary {
  accounts: {
    total: number;
    active: number;
    suspended: number;
    closed: number;
  };
  balances: {
    totalBalance: number;
    averageBalance: number;
    currency: string;
  };
  transactions: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
  volumeByType: Record<string, { count: number; amount: number }>;
  recentTransactions: Transaction[];
  loans?: LoanSummary;
}

export interface ApiResponse<T> {
  data: T;
  total: number;
}

export interface CreateAccountRequest {
  customerName: string;
  productId: string;
  currency?: string;
  initialDeposit?: number;
}

export interface CreateTransactionRequest {
  type: TransactionType;
  sourceAccountId?: string;
  destinationAccountId?: string;
  amount: number;
  currency?: string;
  description?: string;
}

// Loan Enums
export enum LoanType {
  MORTGAGE = 'MORTGAGE',
  CONSUMER_LOAN = 'CONSUMER_LOAN',
  AUTO_LOAN = 'AUTO_LOAN',
  PERSONAL_LOAN = 'PERSONAL_LOAN'
}

export enum LoanStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  PAID_OFF = 'PAID_OFF',
  DEFAULTED = 'DEFAULTED',
  CLOSED = 'CLOSED'
}

// Loan Interfaces
export interface LoanProduct {
  id: string;
  name: string;
  type: LoanType;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  interestRate: number;
  isActive: boolean;
}

export interface Loan {
  id: string;
  loanNumber: string;
  customerId: string;
  customerName: string;
  accountId: string;
  accountNumber: string;
  productId: string;
  productName: string;
  type: LoanType;
  status: LoanStatus;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  outstandingBalance: number;
  totalPaid: number;
  nextPaymentDate: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  loanNumber: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  paymentDate: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: string;
}

export interface CreateLoanRequest {
  customerId: string;
  customerName?: string;
  accountId: string;
  productId: string;
  amount: number;
  termMonths: number;
}

export interface CreateLoanPaymentRequest {
  amount?: number;
}

// Extended Dashboard Summary with Loans
export interface LoanSummary {
  total: number;
  active: number;
  totalOutstanding: number;
  mortgages: number;
  consumerLoans: number;
}

// ============================================================================
// Internal Accounts
// ============================================================================

export enum InternalAccountType {
  SUSPENSE = 'SUSPENSE',
  CLEARING = 'CLEARING',
  SETTLEMENT = 'SETTLEMENT',
  NOSTRO = 'NOSTRO',
  VOSTRO = 'VOSTRO',
  GENERAL_LEDGER = 'GENERAL_LEDGER',
  PROFIT_LOSS = 'PROFIT_LOSS',
  RESERVE = 'RESERVE',
  INTERCOMPANY = 'INTERCOMPANY'
}

export enum InternalAccountStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED'
}

export interface InternalAccount {
  id: string;
  accountNumber: string;
  name: string;
  type: InternalAccountType;
  status: InternalAccountStatus;
  currency: string;
  balance: number;
  description: string;
  glCode: string;
  department: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Nostro Accounts (Correspondent Bank Accounts)
// ============================================================================

export interface NostroAccount {
  id: string;
  accountNumber: string;
  correspondentBank: string;
  correspondentBIC: string;
  country: string;
  currency: string;
  balance: number;
  availableBalance: number;
  creditLine: number;
  status: InternalAccountStatus;
  relationship: 'NOSTRO' | 'VOSTRO' | 'LORO';
  lastReconciled: string;
  reconciledBalance: number;
  unreconciled: number;
  createdAt: string;
  updatedAt: string;
}

export interface NostroTransaction {
  id: string;
  nostroAccountId: string;
  transactionType: 'INCOMING' | 'OUTGOING' | 'FX_SETTLEMENT' | 'INTEREST' | 'FEE';
  amount: number;
  currency: string;
  valueDate: string;
  reference: string;
  counterparty: string;
  status: 'PENDING' | 'SETTLED' | 'RECONCILED' | 'DISPUTED';
  description: string;
  createdAt: string;
}

// ============================================================================
// Position Management
// ============================================================================

export interface CurrencyPosition {
  id: string;
  currency: string;
  longPosition: number;
  shortPosition: number;
  netPosition: number;
  averageRate: number;
  marketRate: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyVolume: number;
  limit: number;
  utilizationPercent: number;
  lastUpdated: string;
}

export interface PositionMovement {
  id: string;
  currency: string;
  movementType: 'BUY' | 'SELL' | 'FX_SPOT' | 'FX_FORWARD' | 'SETTLEMENT';
  amount: number;
  rate: number;
  counterCurrency: string;
  counterAmount: number;
  traderId: string;
  traderName: string;
  valueDate: string;
  status: 'OPEN' | 'SETTLED' | 'CANCELLED';
  createdAt: string;
}

export interface PositionLimit {
  id: string;
  currency: string;
  daylight: number;
  overnight: number;
  stopLoss: number;
  currentUtilization: number;
  status: 'WITHIN_LIMIT' | 'WARNING' | 'BREACH';
}

// ============================================================================
// Suspense Accounts
// ============================================================================

export enum SuspenseReason {
  UNIDENTIFIED_PAYMENT = 'UNIDENTIFIED_PAYMENT',
  PENDING_INVESTIGATION = 'PENDING_INVESTIGATION',
  AWAITING_DOCUMENTATION = 'AWAITING_DOCUMENTATION',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  RECONCILIATION_DIFFERENCE = 'RECONCILIATION_DIFFERENCE',
  FX_SETTLEMENT_PENDING = 'FX_SETTLEMENT_PENDING',
  COMPLIANCE_REVIEW = 'COMPLIANCE_REVIEW',
  CUSTOMER_DISPUTE = 'CUSTOMER_DISPUTE'
}

export interface SuspenseEntry {
  id: string;
  suspenseAccountId: string;
  originalTransactionId: string;
  amount: number;
  currency: string;
  reason: SuspenseReason;
  status: 'OPEN' | 'RESOLVED' | 'WRITTEN_OFF' | 'ESCALATED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo: string;
  notes: string;
  resolution: string | null;
  resolvedAccountId: string | null;
  ageInDays: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface SuspenseAccountSummary {
  accountId: string;
  accountNumber: string;
  name: string;
  totalEntries: number;
  openEntries: number;
  totalAmount: number;
  openAmount: number;
  oldestEntryDays: number;
  criticalCount: number;
  highPriorityCount: number;
}

// ============================================================================
// General Ledger
// ============================================================================

export interface GLAccount {
  id: string;
  accountCode: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category: string;
  subcategory: string;
  balance: number;
  currency: string;
  isActive: boolean;
  parentAccountCode: string | null;
  level: number;
}

export interface GLEntry {
  id: string;
  journalId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  currency: string;
  description: string;
  reference: string;
  transactionId: string | null; // Link back to source transaction for traceability
  postingDate: string;
  valueDate: string;
  transactionType: string;
  status: 'POSTED' | 'PENDING' | 'REVERSED';
  createdBy: string;
  createdAt: string;
}

export interface GLJournal {
  id: string;
  journalNumber: string;
  description: string;
  postingDate: string;
  valueDate: string;
  totalDebit: number;
  totalCredit: number;
  currency: string;
  entries: GLEntry[];
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  createdBy: string;
  approvedBy: string | null;
  createdAt: string;
  postedAt: string | null;
}

export interface GLConsolidatedEntry {
  transactionType: string;
  totalTransactions: number;
  totalDebit: number;
  totalCredit: number;
  netAmount: number;
  currency: string;
  accounts: {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
  }[];
}

export interface GLTrialBalance {
  asOfDate: string;
  accounts: {
    accountCode: string;
    accountName: string;
    type: string;
    openingBalance: number;
    debitMovement: number;
    creditMovement: number;
    closingBalance: number;
  }[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

// API Response types for new features
export interface InternalAccountsResponse {
  data: InternalAccount[];
  total: number;
}

export interface NostroAccountsResponse {
  data: NostroAccount[];
  total: number;
}

export interface PositionsResponse {
  data: CurrencyPosition[];
  total: number;
}

export interface SuspenseEntriesResponse {
  data: SuspenseEntry[];
  total: number;
}

export interface GLEntriesResponse {
  data: GLEntry[];
  total: number;
}

export interface GLConsolidatedResponse {
  data: GLConsolidatedEntry[];
  period: { start: string; end: string };
}
