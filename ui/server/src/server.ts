import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  accounts,
  transactions,
  ledgerEntries,
  products,
  loans,
  loanProducts,
  loanPayments,
  internalAccounts,
  nostroAccounts,
  nostroTransactions,
  currencyPositions,
  positionMovements,
  positionLimits,
  suspenseEntries,
  glAccounts,
  glEntries,
  glJournals,
  Account,
  Transaction,
  LedgerEntry,
  Loan,
  LoanProduct,
  LoanPayment,
  AccountStatus,
  TransactionType,
  TransactionStatus,
  EntryType,
  LoanType,
  LoanStatus,
  InternalAccountType,
  InternalAccountStatus,
  SuspenseReason,
  createAccountNumber,
  createTransactionId,
  createLedgerEntryId,
  createLoanNumber,
  createLoanId,
  createPaymentId
} from './mock-data';

const app = express();
const PORT = 3901;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ============================================================================
// Health Check
// ============================================================================

app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'Banking System API'
  });
});

// ============================================================================
// Dashboard Summary
// ============================================================================

app.get('/api/summary', (req: Request, res: Response) => {
  const activeAccounts = accounts.filter(a => a.status === AccountStatus.ACTIVE);
  const totalBalance = activeAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalTransactions = transactions.length;
  const completedTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
  const pendingTransactions = transactions.filter(t => t.status === TransactionStatus.PENDING);

  // Transaction volume by type
  const volumeByType = Object.values(TransactionType).reduce((acc, type) => {
    const typeTransactions = completedTransactions.filter(t => t.type === type);
    acc[type] = {
      count: typeTransactions.length,
      amount: typeTransactions.reduce((sum, t) => sum + t.amount, 0)
    };
    return acc;
  }, {} as Record<string, { count: number; amount: number }>);

  // Recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  res.json({
    accounts: {
      total: accounts.length,
      active: activeAccounts.length,
      suspended: accounts.filter(a => a.status === AccountStatus.SUSPENDED).length,
      closed: accounts.filter(a => a.status === AccountStatus.CLOSED).length
    },
    balances: {
      totalBalance: Math.round(totalBalance * 100) / 100,
      averageBalance: Math.round((totalBalance / activeAccounts.length) * 100) / 100,
      currency: 'USD'
    },
    transactions: {
      total: totalTransactions,
      completed: completedTransactions.length,
      pending: pendingTransactions.length,
      failed: transactions.filter(t => t.status === TransactionStatus.FAILED).length
    },
    loans: {
      total: loans.length,
      active: loans.filter(l => l.status === LoanStatus.ACTIVE).length,
      totalOutstanding: loans.filter(l => l.status === LoanStatus.ACTIVE).reduce((sum, l) => sum + l.outstandingBalance, 0),
      mortgages: loans.filter(l => l.type === LoanType.MORTGAGE).length,
      consumerLoans: loans.filter(l => l.type === LoanType.CONSUMER_LOAN || l.type === LoanType.PERSONAL_LOAN).length
    },
    volumeByType,
    recentTransactions
  });
});

// ============================================================================
// Accounts
// ============================================================================

// List all accounts
app.get('/api/accounts', (req: Request, res: Response) => {
  const { status, search } = req.query;

  let filtered = [...accounts];

  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.status === status);
  }

  if (search) {
    const searchLower = (search as string).toLowerCase();
    filtered = filtered.filter(a =>
      a.accountNumber.includes(searchLower) ||
      a.customerName.toLowerCase().includes(searchLower)
    );
  }

  res.json({
    data: filtered,
    total: filtered.length
  });
});

// Get account by ID
app.get('/api/accounts/:id', (req: Request, res: Response) => {
  const account = accounts.find(a => a.id === req.params.id);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json(account);
});

// Get account balance
app.get('/api/accounts/:id/balance', (req: Request, res: Response) => {
  const account = accounts.find(a => a.id === req.params.id);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json({
    accountId: account.id,
    accountNumber: account.accountNumber,
    balance: account.balance,
    availableBalance: account.availableBalance,
    overdraftLimit: account.overdraftLimit,
    currency: account.currency
  });
});

// Get account transactions
app.get('/api/accounts/:id/transactions', (req: Request, res: Response) => {
  const account = accounts.find(a => a.id === req.params.id);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const accountTransactions = transactions.filter(
    t => t.sourceAccountId === account.id || t.destinationAccountId === account.id
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    data: accountTransactions,
    total: accountTransactions.length
  });
});

// Get account ledger entries
app.get('/api/accounts/:id/ledger', (req: Request, res: Response) => {
  const account = accounts.find(a => a.id === req.params.id);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  const accountEntries = ledgerEntries
    .filter(e => e.accountId === account.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    data: accountEntries,
    total: accountEntries.length
  });
});

// Create new account
app.post('/api/accounts', (req: Request, res: Response) => {
  const { customerName, productId, currency = 'USD', initialDeposit = 0 } = req.body;

  if (!customerName) {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  const product = products.find(p => p.id === productId);
  if (!product) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  const newAccount: Account = {
    id: `acc-${uuidv4().substring(0, 8)}`,
    accountNumber: createAccountNumber(),
    customerId: `cust-${uuidv4().substring(0, 8)}`,
    customerName,
    productId,
    productName: product.name,
    status: AccountStatus.ACTIVE,
    currency,
    balance: initialDeposit,
    availableBalance: initialDeposit + product.overdraftLimit,
    overdraftLimit: product.overdraftLimit,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  accounts.push(newAccount);

  // Create initial deposit transaction if amount > 0
  if (initialDeposit > 0) {
    const depositTxn: Transaction = {
      id: createTransactionId(),
      sourceAccountId: null,
      sourceAccountNumber: null,
      destinationAccountId: newAccount.id,
      destinationAccountNumber: newAccount.accountNumber,
      amount: initialDeposit,
      currency,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      description: 'Initial deposit',
      reference: `INIT-${newAccount.id}`,
      createdAt: new Date(),
      completedAt: new Date()
    };
    transactions.push(depositTxn);

    const ledgerEntry: LedgerEntry = {
      id: createLedgerEntryId(),
      transactionId: depositTxn.id,
      accountId: newAccount.id,
      accountNumber: newAccount.accountNumber,
      entryType: EntryType.DEBIT,
      amount: initialDeposit,
      balance: initialDeposit,
      currency,
      description: 'Deposit: Initial deposit',
      createdAt: new Date()
    };
    ledgerEntries.push(ledgerEntry);
  }

  res.status(201).json(newAccount);
});

// ============================================================================
// Transactions
// ============================================================================

// List all transactions
app.get('/api/transactions', (req: Request, res: Response) => {
  const { type, status, accountId } = req.query;

  let filtered = [...transactions];

  if (type && type !== 'all') {
    filtered = filtered.filter(t => t.type === type);
  }

  if (status && status !== 'all') {
    filtered = filtered.filter(t => t.status === status);
  }

  if (accountId) {
    filtered = filtered.filter(
      t => t.sourceAccountId === accountId || t.destinationAccountId === accountId
    );
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    data: filtered,
    total: filtered.length
  });
});

// Get transaction by ID
app.get('/api/transactions/:id', (req: Request, res: Response) => {
  const transaction = transactions.find(t => t.id === req.params.id);

  if (!transaction) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  res.json(transaction);
});

// Create new transaction
app.post('/api/transactions', (req: Request, res: Response) => {
  const { type, sourceAccountId, destinationAccountId, amount, currency = 'USD', description } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'Transaction type is required' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  // Validate accounts based on transaction type
  let sourceAccount: Account | undefined;
  let destinationAccount: Account | undefined;

  if (type === TransactionType.WITHDRAWAL || type === TransactionType.PAYMENT || type === TransactionType.TRANSFER) {
    if (!sourceAccountId) {
      return res.status(400).json({ error: 'Source account is required for this transaction type' });
    }
    sourceAccount = accounts.find(a => a.id === sourceAccountId);
    if (!sourceAccount) {
      return res.status(400).json({ error: 'Source account not found' });
    }
    if (sourceAccount.status !== AccountStatus.ACTIVE) {
      return res.status(400).json({ error: 'Source account is not active' });
    }
    if (sourceAccount.availableBalance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }
  }

  if (type === TransactionType.DEPOSIT || type === TransactionType.TRANSFER) {
    if (!destinationAccountId) {
      return res.status(400).json({ error: 'Destination account is required for this transaction type' });
    }
    destinationAccount = accounts.find(a => a.id === destinationAccountId);
    if (!destinationAccount) {
      return res.status(400).json({ error: 'Destination account not found' });
    }
    if (destinationAccount.status !== AccountStatus.ACTIVE) {
      return res.status(400).json({ error: 'Destination account is not active' });
    }
  }

  // Create the transaction
  const newTransaction: Transaction = {
    id: createTransactionId(),
    sourceAccountId: sourceAccountId || null,
    sourceAccountNumber: sourceAccount?.accountNumber || null,
    destinationAccountId: destinationAccountId || null,
    destinationAccountNumber: destinationAccount?.accountNumber || null,
    amount,
    currency,
    type,
    status: TransactionStatus.COMPLETED,
    description: description || `${type} transaction`,
    reference: `REF-${Date.now()}`,
    createdAt: new Date(),
    completedAt: new Date()
  };

  transactions.push(newTransaction);

  // Update account balances and create ledger entries
  if (sourceAccount) {
    sourceAccount.balance -= amount;
    sourceAccount.availableBalance -= amount;
    sourceAccount.updatedAt = new Date();

    ledgerEntries.push({
      id: createLedgerEntryId(),
      transactionId: newTransaction.id,
      accountId: sourceAccount.id,
      accountNumber: sourceAccount.accountNumber,
      entryType: EntryType.CREDIT,
      amount,
      balance: sourceAccount.balance,
      currency,
      description: `${type}: ${description || newTransaction.description}`,
      createdAt: new Date()
    });
  }

  if (destinationAccount) {
    destinationAccount.balance += amount;
    destinationAccount.availableBalance += amount;
    destinationAccount.updatedAt = new Date();

    ledgerEntries.push({
      id: createLedgerEntryId(),
      transactionId: newTransaction.id,
      accountId: destinationAccount.id,
      accountNumber: destinationAccount.accountNumber,
      entryType: EntryType.DEBIT,
      amount,
      balance: destinationAccount.balance,
      currency,
      description: `${type}: ${description || newTransaction.description}`,
      createdAt: new Date()
    });
  }

  res.status(201).json(newTransaction);
});

// ============================================================================
// Ledger
// ============================================================================

// List all ledger entries
app.get('/api/ledger', (req: Request, res: Response) => {
  const { accountId, entryType } = req.query;

  let filtered = [...ledgerEntries];

  if (accountId) {
    filtered = filtered.filter(e => e.accountId === accountId);
  }

  if (entryType && entryType !== 'all') {
    filtered = filtered.filter(e => e.entryType === entryType);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    data: filtered,
    total: filtered.length
  });
});

// Get ledger entries for account
app.get('/api/ledger/:accountId', (req: Request, res: Response) => {
  const accountEntries = ledgerEntries
    .filter(e => e.accountId === req.params.accountId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    data: accountEntries,
    total: accountEntries.length
  });
});

// ============================================================================
// Products
// ============================================================================

// List all products
app.get('/api/products', (req: Request, res: Response) => {
  const { active } = req.query;

  let filtered = [...products];

  if (active === 'true') {
    filtered = filtered.filter(p => p.isActive);
  }

  res.json({
    data: filtered,
    total: filtered.length
  });
});

// Get product by ID
app.get('/api/products/:id', (req: Request, res: Response) => {
  const product = products.find(p => p.id === req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
});

// ============================================================================
// Loan Products
// ============================================================================

// List all loan products
app.get('/api/loan-products', (req: Request, res: Response) => {
  const { active } = req.query;
  let filtered = [...loanProducts];
  if (active === 'true') {
    filtered = filtered.filter(p => p.isActive);
  }
  res.json({ data: filtered, total: filtered.length });
});

// Get loan product by ID
app.get('/api/loan-products/:id', (req: Request, res: Response) => {
  const product = loanProducts.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Loan product not found' });
  }
  res.json(product);
});

// ============================================================================
// Loans
// ============================================================================

// List all loans
app.get('/api/loans', (req: Request, res: Response) => {
  const { type, status, customerId, accountId } = req.query;
  let filtered = [...loans];

  if (type && type !== 'all') {
    filtered = filtered.filter(l => l.type === type);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(l => l.status === status);
  }
  if (customerId) {
    filtered = filtered.filter(l => l.customerId === customerId);
  }
  if (accountId) {
    filtered = filtered.filter(l => l.accountId === accountId);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ data: filtered, total: filtered.length });
});

// Get loan by ID
app.get('/api/loans/:id', (req: Request, res: Response) => {
  const loan = loans.find(l => l.id === req.params.id);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }
  res.json(loan);
});

// Get loan payments
app.get('/api/loans/:id/payments', (req: Request, res: Response) => {
  const loan = loans.find(l => l.id === req.params.id);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }
  const payments = loanPayments
    .filter(p => p.loanId === loan.id)
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  res.json({ data: payments, total: payments.length });
});

// Create new loan
app.post('/api/loans', (req: Request, res: Response) => {
  const { customerId, customerName, accountId, productId, amount, termMonths } = req.body;

  if (!customerId || !accountId || !productId || !amount || !termMonths) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const product = loanProducts.find(p => p.id === productId);
  if (!product) {
    return res.status(400).json({ error: 'Invalid loan product' });
  }

  const account = accounts.find(a => a.id === accountId);
  if (!account) {
    return res.status(400).json({ error: 'Account not found' });
  }

  if (amount < product.minAmount || amount > product.maxAmount) {
    return res.status(400).json({ error: `Amount must be between ${product.minAmount} and ${product.maxAmount}` });
  }

  const monthlyRate = product.interestRate / 12;
  const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + termMonths);

  const nextPaymentDate = new Date();
  nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

  const newLoan: Loan = {
    id: createLoanId(),
    loanNumber: createLoanNumber(),
    customerId,
    customerName: customerName || account.customerName,
    accountId,
    accountNumber: account.accountNumber,
    productId,
    productName: product.name,
    type: product.type,
    status: LoanStatus.ACTIVE,
    principalAmount: amount,
    interestRate: product.interestRate,
    termMonths,
    monthlyPayment: Math.round(monthlyPayment * 100) / 100,
    outstandingBalance: amount,
    totalPaid: 0,
    nextPaymentDate,
    startDate,
    endDate,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  loans.push(newLoan);
  res.status(201).json(newLoan);
});

// Make loan payment
app.post('/api/loans/:id/payments', (req: Request, res: Response) => {
  const loan = loans.find(l => l.id === req.params.id);
  if (!loan) {
    return res.status(404).json({ error: 'Loan not found' });
  }

  const { amount } = req.body;
  const paymentAmount = amount || loan.monthlyPayment;

  if (loan.outstandingBalance <= 0) {
    return res.status(400).json({ error: 'Loan is already paid off' });
  }

  const interestPortion = (loan.outstandingBalance * loan.interestRate) / 12;
  const principalPortion = Math.min(paymentAmount - interestPortion, loan.outstandingBalance);
  const actualPayment = principalPortion + interestPortion;

  loan.outstandingBalance = Math.max(0, loan.outstandingBalance - principalPortion);
  loan.totalPaid += actualPayment;
  loan.updatedAt = new Date();

  if (loan.outstandingBalance <= 0) {
    loan.status = LoanStatus.PAID_OFF;
  } else {
    const nextDate = new Date(loan.nextPaymentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    loan.nextPaymentDate = nextDate;
  }

  const payment: LoanPayment = {
    id: createPaymentId(),
    loanId: loan.id,
    loanNumber: loan.loanNumber,
    amount: Math.round(actualPayment * 100) / 100,
    principal: Math.round(principalPortion * 100) / 100,
    interest: Math.round(interestPortion * 100) / 100,
    balance: Math.round(loan.outstandingBalance * 100) / 100,
    paymentDate: new Date(),
    status: 'COMPLETED',
    createdAt: new Date()
  };

  loanPayments.push(payment);
  res.status(201).json(payment);
});

// ============================================================================
// Internal Accounts
// ============================================================================

// List all internal accounts
app.get('/api/internal-accounts', (req: Request, res: Response) => {
  const { type, status } = req.query;
  let filtered = [...internalAccounts];

  if (type && type !== 'all') {
    filtered = filtered.filter(a => a.type === type);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.status === status);
  }

  res.json({ data: filtered, total: filtered.length });
});

// Get internal account by ID
app.get('/api/internal-accounts/:id', (req: Request, res: Response) => {
  const account = internalAccounts.find(a => a.id === req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Internal account not found' });
  }
  res.json(account);
});

// ============================================================================
// Nostro Accounts
// ============================================================================

// List all nostro accounts
app.get('/api/nostro-accounts', (req: Request, res: Response) => {
  const { currency, relationship, status } = req.query;
  let filtered = [...nostroAccounts];

  if (currency && currency !== 'all') {
    filtered = filtered.filter(a => a.currency === currency);
  }
  if (relationship && relationship !== 'all') {
    filtered = filtered.filter(a => a.relationship === relationship);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(a => a.status === status);
  }

  res.json({ data: filtered, total: filtered.length });
});

// Get nostro account by ID
app.get('/api/nostro-accounts/:id', (req: Request, res: Response) => {
  const account = nostroAccounts.find(a => a.id === req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Nostro account not found' });
  }
  res.json(account);
});

// Get nostro account transactions
app.get('/api/nostro-accounts/:id/transactions', (req: Request, res: Response) => {
  const account = nostroAccounts.find(a => a.id === req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Nostro account not found' });
  }

  const txns = nostroTransactions
    .filter(t => t.nostroAccountId === req.params.id)
    .sort((a, b) => new Date(b.valueDate).getTime() - new Date(a.valueDate).getTime());

  res.json({ data: txns, total: txns.length });
});

// Get nostro summary
app.get('/api/nostro-summary', (req: Request, res: Response) => {
  const summary = {
    totalAccounts: nostroAccounts.length,
    totalBalance: nostroAccounts.reduce((sum, a) => sum + a.balance, 0),
    totalUnreconciled: nostroAccounts.reduce((sum, a) => sum + Math.abs(a.unreconciled), 0),
    byCurrency: nostroAccounts.reduce((acc, a) => {
      if (!acc[a.currency]) {
        acc[a.currency] = { count: 0, balance: 0, unreconciled: 0 };
      }
      acc[a.currency].count++;
      acc[a.currency].balance += a.balance;
      acc[a.currency].unreconciled += Math.abs(a.unreconciled);
      return acc;
    }, {} as Record<string, { count: number; balance: number; unreconciled: number }>)
  };
  res.json(summary);
});

// ============================================================================
// Position Management
// ============================================================================

// List all currency positions
app.get('/api/positions', (req: Request, res: Response) => {
  const { currency } = req.query;
  let filtered = [...currencyPositions];

  if (currency && currency !== 'all') {
    filtered = filtered.filter(p => p.currency === currency);
  }

  res.json({ data: filtered, total: filtered.length });
});

// Get position by currency
app.get('/api/positions/:currency', (req: Request, res: Response) => {
  const position = currencyPositions.find(p => p.currency === req.params.currency.toUpperCase());
  if (!position) {
    return res.status(404).json({ error: 'Position not found' });
  }
  res.json(position);
});

// Get position movements
app.get('/api/positions/:currency/movements', (req: Request, res: Response) => {
  const { status, type } = req.query;
  let movements = positionMovements.filter(m => m.currency === req.params.currency.toUpperCase());

  if (status && status !== 'all') {
    movements = movements.filter(m => m.status === status);
  }
  if (type && type !== 'all') {
    movements = movements.filter(m => m.movementType === type);
  }

  movements.sort((a, b) => new Date(b.valueDate).getTime() - new Date(a.valueDate).getTime());
  res.json({ data: movements, total: movements.length });
});

// Get position limits
app.get('/api/position-limits', (req: Request, res: Response) => {
  res.json({ data: positionLimits, total: positionLimits.length });
});

// Get positions summary
app.get('/api/positions-summary', (req: Request, res: Response) => {
  const summary = {
    totalPositions: currencyPositions.length,
    totalUnrealizedPnL: currencyPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0),
    totalRealizedPnL: currencyPositions.reduce((sum, p) => sum + p.realizedPnL, 0),
    totalDailyVolume: currencyPositions.reduce((sum, p) => sum + p.dailyVolume, 0),
    breaches: positionLimits.filter(l => l.status === 'BREACH').length,
    warnings: positionLimits.filter(l => l.status === 'WARNING').length,
    withinLimit: positionLimits.filter(l => l.status === 'WITHIN_LIMIT').length
  };
  res.json(summary);
});

// ============================================================================
// Suspense Accounts
// ============================================================================

// List all suspense entries
app.get('/api/suspense-entries', (req: Request, res: Response) => {
  const { status, priority, reason, accountId } = req.query;
  let filtered = [...suspenseEntries];

  if (status && status !== 'all') {
    filtered = filtered.filter(e => e.status === status);
  }
  if (priority && priority !== 'all') {
    filtered = filtered.filter(e => e.priority === priority);
  }
  if (reason && reason !== 'all') {
    filtered = filtered.filter(e => e.reason === reason);
  }
  if (accountId) {
    filtered = filtered.filter(e => e.suspenseAccountId === accountId);
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ data: filtered, total: filtered.length });
});

// Get suspense entry by ID
app.get('/api/suspense-entries/:id', (req: Request, res: Response) => {
  const entry = suspenseEntries.find(e => e.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Suspense entry not found' });
  }
  res.json(entry);
});

// Get suspense summary
app.get('/api/suspense-summary', (req: Request, res: Response) => {
  const openEntries = suspenseEntries.filter(e => e.status === 'OPEN');
  const summary = {
    totalEntries: suspenseEntries.length,
    openEntries: openEntries.length,
    resolvedEntries: suspenseEntries.filter(e => e.status === 'RESOLVED').length,
    escalatedEntries: suspenseEntries.filter(e => e.status === 'ESCALATED').length,
    writtenOffEntries: suspenseEntries.filter(e => e.status === 'WRITTEN_OFF').length,
    totalOpenAmount: openEntries.reduce((sum, e) => sum + e.amount, 0),
    criticalCount: openEntries.filter(e => e.priority === 'CRITICAL').length,
    highPriorityCount: openEntries.filter(e => e.priority === 'HIGH').length,
    avgAgeInDays: openEntries.length > 0
      ? Math.round(openEntries.reduce((sum, e) => sum + e.ageInDays, 0) / openEntries.length)
      : 0,
    byReason: suspenseEntries.reduce((acc, e) => {
      acc[e.reason] = (acc[e.reason] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };
  res.json(summary);
});

// ============================================================================
// General Ledger
// ============================================================================

// List GL accounts
app.get('/api/gl-accounts', (req: Request, res: Response) => {
  const { type, category, active } = req.query;
  let filtered = [...glAccounts];

  if (type && type !== 'all') {
    filtered = filtered.filter(a => a.type === type);
  }
  if (category) {
    filtered = filtered.filter(a => a.category === category);
  }
  if (active === 'true') {
    filtered = filtered.filter(a => a.isActive);
  }

  filtered.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  res.json({ data: filtered, total: filtered.length });
});

// Get GL account by code
app.get('/api/gl-accounts/:code', (req: Request, res: Response) => {
  const account = glAccounts.find(a => a.accountCode === req.params.code);
  if (!account) {
    return res.status(404).json({ error: 'GL account not found' });
  }
  res.json(account);
});

// List GL entries
app.get('/api/gl-entries', (req: Request, res: Response) => {
  const { accountCode, transactionType, status, startDate, endDate } = req.query;
  let filtered = [...glEntries];

  if (accountCode) {
    filtered = filtered.filter(e => e.accountCode === accountCode);
  }
  if (transactionType && transactionType !== 'all') {
    filtered = filtered.filter(e => e.transactionType === transactionType);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter(e => e.status === status);
  }
  if (startDate) {
    filtered = filtered.filter(e => new Date(e.postingDate) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.postingDate) <= new Date(endDate as string));
  }

  filtered.sort((a, b) => new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime());
  res.json({ data: filtered, total: filtered.length });
});

// List GL journals
app.get('/api/gl-journals', (req: Request, res: Response) => {
  const { status, startDate, endDate } = req.query;
  let filtered = [...glJournals];

  if (status && status !== 'all') {
    filtered = filtered.filter(j => j.status === status);
  }
  if (startDate) {
    filtered = filtered.filter(j => new Date(j.postingDate) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(j => new Date(j.postingDate) <= new Date(endDate as string));
  }

  filtered.sort((a, b) => new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime());
  res.json({ data: filtered, total: filtered.length });
});

// Get GL journal by ID
app.get('/api/gl-journals/:id', (req: Request, res: Response) => {
  const journal = glJournals.find(j => j.id === req.params.id);
  if (!journal) {
    return res.status(404).json({ error: 'GL journal not found' });
  }
  res.json(journal);
});

// Get GL consolidated entries by transaction type
app.get('/api/gl-consolidated', (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  let filtered = [...glEntries];

  if (startDate) {
    filtered = filtered.filter(e => new Date(e.postingDate) >= new Date(startDate as string));
  }
  if (endDate) {
    filtered = filtered.filter(e => new Date(e.postingDate) <= new Date(endDate as string));
  }

  // Group by transaction type
  const consolidated = filtered.reduce((acc, entry) => {
    const type = entry.transactionType;
    if (!acc[type]) {
      acc[type] = {
        transactionType: type,
        totalTransactions: 0,
        totalDebit: 0,
        totalCredit: 0,
        netAmount: 0,
        currency: entry.currency,
        accounts: new Map<string, { accountCode: string; accountName: string; debit: number; credit: number }>()
      };
    }

    acc[type].totalDebit += entry.debit;
    acc[type].totalCredit += entry.credit;
    acc[type].netAmount = acc[type].totalDebit - acc[type].totalCredit;

    if (entry.debit > 0 || entry.credit > 0) {
      const existing = acc[type].accounts.get(entry.accountCode) || {
        accountCode: entry.accountCode,
        accountName: entry.accountName,
        debit: 0,
        credit: 0
      };
      existing.debit += entry.debit;
      existing.credit += entry.credit;
      acc[type].accounts.set(entry.accountCode, existing);
    }

    return acc;
  }, {} as Record<string, any>);

  // Convert to array and format
  const result = Object.values(consolidated).map((item: any) => ({
    transactionType: item.transactionType,
    totalTransactions: item.accounts.size,
    totalDebit: parseFloat(item.totalDebit.toFixed(2)),
    totalCredit: parseFloat(item.totalCredit.toFixed(2)),
    netAmount: parseFloat(item.netAmount.toFixed(2)),
    currency: item.currency,
    accounts: Array.from(item.accounts.values()).map((a: any) => ({
      accountCode: a.accountCode,
      accountName: a.accountName,
      debit: parseFloat(a.debit.toFixed(2)),
      credit: parseFloat(a.credit.toFixed(2))
    }))
  }));

  res.json({
    data: result,
    period: {
      start: startDate || new Date(Math.min(...filtered.map(e => new Date(e.postingDate).getTime()))).toISOString(),
      end: endDate || new Date(Math.max(...filtered.map(e => new Date(e.postingDate).getTime()))).toISOString()
    }
  });
});

// Get trial balance
app.get('/api/gl-trial-balance', (req: Request, res: Response) => {
  const { asOfDate } = req.query;
  const cutoffDate = asOfDate ? new Date(asOfDate as string) : new Date();

  const trialBalance = glAccounts.map(account => {
    const accountEntries = glEntries.filter(
      e => e.accountCode === account.accountCode && new Date(e.postingDate) <= cutoffDate
    );

    const debitMovement = accountEntries.reduce((sum, e) => sum + e.debit, 0);
    const creditMovement = accountEntries.reduce((sum, e) => sum + e.credit, 0);

    return {
      accountCode: account.accountCode,
      accountName: account.name,
      type: account.type,
      openingBalance: account.balance,
      debitMovement: parseFloat(debitMovement.toFixed(2)),
      creditMovement: parseFloat(creditMovement.toFixed(2)),
      closingBalance: parseFloat((account.balance + debitMovement - creditMovement).toFixed(2))
    };
  });

  const totalDebits = trialBalance.reduce((sum, a) => sum + a.debitMovement, 0);
  const totalCredits = trialBalance.reduce((sum, a) => sum + a.creditMovement, 0);

  res.json({
    asOfDate: cutoffDate.toISOString(),
    accounts: trialBalance,
    totalDebits: parseFloat(totalDebits.toFixed(2)),
    totalCredits: parseFloat(totalCredits.toFixed(2)),
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
  });
});

// ============================================================================
// Error Handling
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`
====================================================
  Banking System API Server
====================================================
  Status:    Running
  Port:      ${PORT}
  Health:    http://localhost:${PORT}/api/health

  Available Endpoints:
  - GET  /api/health
  - GET  /api/summary

  Accounts:
  - GET  /api/accounts
  - GET  /api/accounts/:id
  - POST /api/accounts

  Transactions:
  - GET  /api/transactions
  - GET  /api/transactions/:id
  - POST /api/transactions

  Ledger:
  - GET  /api/ledger
  - GET  /api/ledger/:accountId

  Internal Accounts:
  - GET  /api/internal-accounts
  - GET  /api/internal-accounts/:id

  Nostro Accounts:
  - GET  /api/nostro-accounts
  - GET  /api/nostro-accounts/:id
  - GET  /api/nostro-accounts/:id/transactions
  - GET  /api/nostro-summary

  Positions:
  - GET  /api/positions
  - GET  /api/positions/:currency
  - GET  /api/positions/:currency/movements
  - GET  /api/position-limits
  - GET  /api/positions-summary

  Suspense:
  - GET  /api/suspense-entries
  - GET  /api/suspense-entries/:id
  - GET  /api/suspense-summary

  General Ledger:
  - GET  /api/gl-accounts
  - GET  /api/gl-accounts/:code
  - GET  /api/gl-entries
  - GET  /api/gl-journals
  - GET  /api/gl-journals/:id
  - GET  /api/gl-consolidated
  - GET  /api/gl-trial-balance

  Loans:
  - GET  /api/loans
  - GET  /api/loans/:id
  - POST /api/loans
====================================================
  `);
});

export default app;
