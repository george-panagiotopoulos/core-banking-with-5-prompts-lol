import axios from 'axios';
import {
  Account,
  Transaction,
  LedgerEntry,
  Product,
  DashboardSummary,
  ApiResponse,
  CreateAccountRequest,
  CreateTransactionRequest,
  Loan,
  LoanProduct,
  LoanPayment,
  CreateLoanRequest,
  CreateLoanPaymentRequest,
  InternalAccount,
  NostroAccount,
  NostroTransaction,
  CurrencyPosition,
  PositionMovement,
  PositionLimit,
  SuspenseEntry,
  GLAccount,
  GLEntry,
  GLJournal,
  GLConsolidatedEntry,
  GLTrialBalance
} from '../types';

const API_BASE_URL = 'http://localhost:3901/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Health check
export const checkHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Dashboard
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await api.get('/summary');
  return response.data;
};

// Accounts
export const getAccounts = async (status?: string, search?: string): Promise<ApiResponse<Account[]>> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  const response = await api.get(`/accounts?${params.toString()}`);
  return response.data;
};

export const getAccount = async (id: string): Promise<Account> => {
  const response = await api.get(`/accounts/${id}`);
  return response.data;
};

export const getAccountBalance = async (id: string) => {
  const response = await api.get(`/accounts/${id}/balance`);
  return response.data;
};

export const getAccountTransactions = async (id: string): Promise<ApiResponse<Transaction[]>> => {
  const response = await api.get(`/accounts/${id}/transactions`);
  return response.data;
};

export const getAccountLedger = async (id: string): Promise<ApiResponse<LedgerEntry[]>> => {
  const response = await api.get(`/accounts/${id}/ledger`);
  return response.data;
};

export const createAccount = async (data: CreateAccountRequest): Promise<Account> => {
  const response = await api.post('/accounts', data);
  return response.data;
};

// Transactions
export const getTransactions = async (
  type?: string,
  status?: string,
  accountId?: string
): Promise<ApiResponse<Transaction[]>> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (status) params.append('status', status);
  if (accountId) params.append('accountId', accountId);
  const response = await api.get(`/transactions?${params.toString()}`);
  return response.data;
};

export const getTransaction = async (id: string): Promise<Transaction> => {
  const response = await api.get(`/transactions/${id}`);
  return response.data;
};

export const createTransaction = async (data: CreateTransactionRequest): Promise<Transaction> => {
  const response = await api.post('/transactions', data);
  return response.data;
};

// Ledger
export const getLedgerEntries = async (
  accountId?: string,
  entryType?: string
): Promise<ApiResponse<LedgerEntry[]>> => {
  const params = new URLSearchParams();
  if (accountId) params.append('accountId', accountId);
  if (entryType) params.append('entryType', entryType);
  const response = await api.get(`/ledger?${params.toString()}`);
  return response.data;
};

// Products
export const getProducts = async (activeOnly?: boolean): Promise<ApiResponse<Product[]>> => {
  const params = activeOnly ? '?active=true' : '';
  const response = await api.get(`/products${params}`);
  return response.data;
};

export const getProduct = async (id: string): Promise<Product> => {
  const response = await api.get(`/products/${id}`);
  return response.data;
};

// Loan Products
export const getLoanProducts = async (activeOnly?: boolean): Promise<ApiResponse<LoanProduct[]>> => {
  const params = activeOnly ? '?active=true' : '';
  const response = await api.get(`/loan-products${params}`);
  return response.data;
};

export const getLoanProduct = async (id: string): Promise<LoanProduct> => {
  const response = await api.get(`/loan-products/${id}`);
  return response.data;
};

// Loans
export const getLoans = async (
  type?: string,
  status?: string,
  customerId?: string,
  accountId?: string
): Promise<ApiResponse<Loan[]>> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (status) params.append('status', status);
  if (customerId) params.append('customerId', customerId);
  if (accountId) params.append('accountId', accountId);
  const response = await api.get(`/loans?${params.toString()}`);
  return response.data;
};

export const getLoan = async (id: string): Promise<Loan> => {
  const response = await api.get(`/loans/${id}`);
  return response.data;
};

export const getLoanPayments = async (loanId: string): Promise<ApiResponse<LoanPayment[]>> => {
  const response = await api.get(`/loans/${loanId}/payments`);
  return response.data;
};

export const createLoan = async (data: CreateLoanRequest): Promise<Loan> => {
  const response = await api.post('/loans', data);
  return response.data;
};

export const makeLoanPayment = async (loanId: string, data?: CreateLoanPaymentRequest): Promise<LoanPayment> => {
  const response = await api.post(`/loans/${loanId}/payments`, data || {});
  return response.data;
};

// ============================================================================
// Internal Accounts
// ============================================================================

export const getInternalAccounts = async (
  type?: string,
  status?: string
): Promise<ApiResponse<InternalAccount[]>> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (status) params.append('status', status);
  const response = await api.get(`/internal-accounts?${params.toString()}`);
  return response.data;
};

export const getInternalAccount = async (id: string): Promise<InternalAccount> => {
  const response = await api.get(`/internal-accounts/${id}`);
  return response.data;
};

// ============================================================================
// Nostro Accounts
// ============================================================================

export const getNostroAccounts = async (
  currency?: string,
  relationship?: string,
  status?: string
): Promise<ApiResponse<NostroAccount[]>> => {
  const params = new URLSearchParams();
  if (currency) params.append('currency', currency);
  if (relationship) params.append('relationship', relationship);
  if (status) params.append('status', status);
  const response = await api.get(`/nostro-accounts?${params.toString()}`);
  return response.data;
};

export const getNostroAccount = async (id: string): Promise<NostroAccount> => {
  const response = await api.get(`/nostro-accounts/${id}`);
  return response.data;
};

export const getNostroTransactions = async (id: string): Promise<ApiResponse<NostroTransaction[]>> => {
  const response = await api.get(`/nostro-accounts/${id}/transactions`);
  return response.data;
};

export const getNostroSummary = async () => {
  const response = await api.get('/nostro-summary');
  return response.data;
};

// ============================================================================
// Position Management
// ============================================================================

export const getPositions = async (currency?: string): Promise<ApiResponse<CurrencyPosition[]>> => {
  const params = currency ? `?currency=${currency}` : '';
  const response = await api.get(`/positions${params}`);
  return response.data;
};

export const getPosition = async (currency: string): Promise<CurrencyPosition> => {
  const response = await api.get(`/positions/${currency}`);
  return response.data;
};

export const getPositionMovements = async (
  currency: string,
  status?: string,
  type?: string
): Promise<ApiResponse<PositionMovement[]>> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (type) params.append('type', type);
  const response = await api.get(`/positions/${currency}/movements?${params.toString()}`);
  return response.data;
};

export const getPositionLimits = async (): Promise<ApiResponse<PositionLimit[]>> => {
  const response = await api.get('/position-limits');
  return response.data;
};

export const getPositionsSummary = async () => {
  const response = await api.get('/positions-summary');
  return response.data;
};

// ============================================================================
// Suspense Accounts
// ============================================================================

export const getSuspenseEntries = async (
  status?: string,
  priority?: string,
  reason?: string,
  accountId?: string
): Promise<ApiResponse<SuspenseEntry[]>> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);
  if (reason) params.append('reason', reason);
  if (accountId) params.append('accountId', accountId);
  const response = await api.get(`/suspense-entries?${params.toString()}`);
  return response.data;
};

export const getSuspenseEntry = async (id: string): Promise<SuspenseEntry> => {
  const response = await api.get(`/suspense-entries/${id}`);
  return response.data;
};

export const getSuspenseSummary = async () => {
  const response = await api.get('/suspense-summary');
  return response.data;
};

// ============================================================================
// General Ledger
// ============================================================================

export const getGLAccounts = async (
  type?: string,
  category?: string,
  active?: boolean
): Promise<ApiResponse<GLAccount[]>> => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (category) params.append('category', category);
  if (active !== undefined) params.append('active', String(active));
  const response = await api.get(`/gl-accounts?${params.toString()}`);
  return response.data;
};

export const getGLAccount = async (code: string): Promise<GLAccount> => {
  const response = await api.get(`/gl-accounts/${code}`);
  return response.data;
};

export const getGLEntries = async (
  accountCode?: string,
  transactionType?: string,
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<GLEntry[]>> => {
  const params = new URLSearchParams();
  if (accountCode) params.append('accountCode', accountCode);
  if (transactionType) params.append('transactionType', transactionType);
  if (status) params.append('status', status);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/gl-entries?${params.toString()}`);
  return response.data;
};

export const getGLJournals = async (
  status?: string,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<GLJournal[]>> => {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/gl-journals?${params.toString()}`);
  return response.data;
};

export const getGLJournal = async (id: string): Promise<GLJournal> => {
  const response = await api.get(`/gl-journals/${id}`);
  return response.data;
};

export const getGLConsolidated = async (
  startDate?: string,
  endDate?: string
): Promise<{ data: GLConsolidatedEntry[]; period: { start: string; end: string } }> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const response = await api.get(`/gl-consolidated?${params.toString()}`);
  return response.data;
};

export const getGLTrialBalance = async (asOfDate?: string): Promise<GLTrialBalance> => {
  const params = asOfDate ? `?asOfDate=${asOfDate}` : '';
  const response = await api.get(`/gl-trial-balance${params}`);
  return response.data;
};

export default api;
