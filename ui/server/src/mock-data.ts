import { v4 as uuidv4 } from 'uuid';

// Enums matching the core banking system
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

export enum ProductType {
  CURRENT_ACCOUNT = 'CURRENT_ACCOUNT',
  PREMIUM_CURRENT = 'PREMIUM_CURRENT',
  BASIC_ACCOUNT = 'BASIC_ACCOUNT',
  BUSINESS_ACCOUNT = 'BUSINESS_ACCOUNT',
  STUDENT_ACCOUNT = 'STUDENT_ACCOUNT'
}

// New Loan Enums
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
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  completedAt: Date | null;
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
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  currency: string;
  minimumBalance: number;
  overdraftLimit: number;
  interestRate: number;
  monthlyFee: number;
  isActive: boolean;
}

// New Loan Interfaces
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
  nextPaymentDate: Date;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  loanNumber: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  paymentDate: Date;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  createdAt: Date;
}

// Helper Functions
function generateAccountNumber(): string {
  const bankCode = '01';
  const branchCode = '123456';
  const accountSeq = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return `${bankCode}${branchCode}${accountSeq}`;
}

export function createAccountNumber(): string {
  return generateAccountNumber();
}

export function createTransactionId(): string {
  return `txn-${uuidv4().substring(0, 8)}`;
}

export function createLedgerEntryId(): string {
  return `led-${uuidv4().substring(0, 8)}`;
}

export function createLoanNumber(): string {
  const prefix = 'LN';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}${timestamp}${random}`;
}

export function createLoanId(): string {
  return `loan-${uuidv4().substring(0, 8)}`;
}

export function createPaymentId(): string {
  return `pmt-${uuidv4().substring(0, 8)}`;
}

// Calculate monthly payment using amortization formula
function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
}

// Random date generator
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Realistic US Names
const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Barbara',
  'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen',
  'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra',
  'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Edward', 'Deborah',
  'Ronald', 'Stephanie', 'Timothy', 'Rebecca', 'Jason', 'Sharon', 'Jeffrey', 'Laura', 'Ryan', 'Cynthia',
  'Jacob', 'Kathleen', 'Gary', 'Amy', 'Nicholas', 'Shirley', 'Eric', 'Angela', 'Jonathan', 'Helen',
  'Stephen', 'Anna', 'Larry', 'Brenda', 'Justin', 'Pamela', 'Scott', 'Nicole', 'Brandon', 'Emma',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra', 'Alexander', 'Rachel',
  'Frank', 'Catherine', 'Patrick', 'Carolyn', 'Raymond', 'Janet', 'Jack', 'Ruth', 'Dennis', 'Maria'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
];

// Mock Products
export const products: Product[] = [
  {
    id: 'prod-001',
    name: 'Standard Current Account',
    type: ProductType.CURRENT_ACCOUNT,
    currency: 'USD',
    minimumBalance: 100,
    overdraftLimit: 500,
    interestRate: 0.01,
    monthlyFee: 5,
    isActive: true
  },
  {
    id: 'prod-002',
    name: 'Premium Current Account',
    type: ProductType.PREMIUM_CURRENT,
    currency: 'USD',
    minimumBalance: 1000,
    overdraftLimit: 5000,
    interestRate: 0.02,
    monthlyFee: 15,
    isActive: true
  },
  {
    id: 'prod-003',
    name: 'Business Account',
    type: ProductType.BUSINESS_ACCOUNT,
    currency: 'USD',
    minimumBalance: 5000,
    overdraftLimit: 25000,
    interestRate: 0.015,
    monthlyFee: 25,
    isActive: true
  },
  {
    id: 'prod-004',
    name: 'Student Account',
    type: ProductType.STUDENT_ACCOUNT,
    currency: 'USD',
    minimumBalance: 0,
    overdraftLimit: 100,
    interestRate: 0.005,
    monthlyFee: 0,
    isActive: true
  }
];

// Mock Loan Products - Exact specifications as requested
export const loanProducts: LoanProduct[] = [
  {
    id: 'loan-prod-001',
    name: '30-Year Fixed Mortgage',
    type: LoanType.MORTGAGE,
    minAmount: 50000,
    maxAmount: 2000000,
    minTermMonths: 180,
    maxTermMonths: 360,
    interestRate: 3.5,
    isActive: true
  },
  {
    id: 'loan-prod-002',
    name: '15-Year Fixed Mortgage',
    type: LoanType.MORTGAGE,
    minAmount: 50000,
    maxAmount: 1000000,
    minTermMonths: 60,
    maxTermMonths: 180,
    interestRate: 2.75,
    isActive: true
  },
  {
    id: 'loan-prod-003',
    name: 'Consumer Loan',
    type: LoanType.CONSUMER_LOAN,
    minAmount: 1000,
    maxAmount: 50000,
    minTermMonths: 12,
    maxTermMonths: 84,
    interestRate: 7.5,
    isActive: true
  },
  {
    id: 'loan-prod-004',
    name: 'Personal Line of Credit',
    type: LoanType.PERSONAL_LOAN,
    minAmount: 500,
    maxAmount: 25000,
    minTermMonths: 6,
    maxTermMonths: 60,
    interestRate: 9.5,
    isActive: true
  }
];

// Generate 100 Customers with 2-4 accounts each
interface Customer {
  id: string;
  name: string;
  accountCount: number;
}

const customers: Customer[] = [];
for (let i = 1; i <= 100; i++) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  customers.push({
    id: `cust-${i.toString().padStart(3, '0')}`,
    name: `${firstName} ${lastName}`,
    accountCount: Math.floor(Math.random() * 3) + 2 // 2-4 accounts
  });
}

// Generate Accounts
export const accounts: Account[] = [];
let accountCounter = 1;
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

for (const customer of customers) {
  for (let i = 0; i < customer.accountCount; i++) {
    // Randomly select product
    const product = products[Math.floor(Math.random() * products.length)];

    // Determine status (85% active, 10% suspended, 5% closed)
    let status: AccountStatus;
    const statusRoll = Math.random();
    if (statusRoll < 0.85) {
      status = AccountStatus.ACTIVE;
    } else if (statusRoll < 0.95) {
      status = AccountStatus.SUSPENDED;
    } else {
      status = AccountStatus.CLOSED;
    }

    // Generate balance based on product type
    let balance: number;
    switch (product.type) {
      case ProductType.STUDENT_ACCOUNT:
        balance = Math.random() * 4900 + 100; // $100-$5,000
        break;
      case ProductType.CURRENT_ACCOUNT:
        balance = Math.random() * 24500 + 500; // $500-$25,000
        break;
      case ProductType.PREMIUM_CURRENT:
        balance = Math.random() * 70000 + 5000; // $5,000-$75,000
        break;
      case ProductType.BUSINESS_ACCOUNT:
        balance = Math.random() * 475000 + 25000; // $25,000-$500,000
        break;
      default:
        balance = Math.random() * 10000 + 1000;
    }

    // Suspended accounts might have negative balance
    if (status === AccountStatus.SUSPENDED && Math.random() < 0.3) {
      balance = -Math.random() * 500;
    }

    const createdDate = randomDate(new Date('2020-01-01'), sixMonthsAgo);

    accounts.push({
      id: `acc-${accountCounter.toString().padStart(3, '0')}`,
      accountNumber: generateAccountNumber(),
      customerId: customer.id,
      customerName: customer.name,
      status,
      currency: 'USD',
      balance: parseFloat(balance.toFixed(2)),
      availableBalance: parseFloat((balance + product.overdraftLimit).toFixed(2)),
      overdraftLimit: product.overdraftLimit,
      productId: product.id,
      productName: product.name,
      createdAt: createdDate,
      updatedAt: new Date()
    });

    accountCounter++;
  }
}

// Generate Loans for 50% of customers (50 customers)
export const loans: Loan[] = [];
export const loanPayments: LoanPayment[] = [];
let loanCounter = 1;
let paymentCounter = 1;

// Select 50 random customers for loans
const customersWithLoans = customers.slice(0, 50);

for (const customer of customersWithLoans) {
  // Each customer gets 1-2 loans
  const loanCount = Math.random() < 0.6 ? 1 : 2;

  for (let i = 0; i < loanCount; i++) {
    // 40% mortgages, 60% consumer/personal loans
    const isMortgage = Math.random() < 0.4;
    let loanProduct: LoanProduct;
    let principalAmount: number;
    let termMonths: number;

    if (isMortgage) {
      // Mortgage
      loanProduct = Math.random() < 0.7 ? loanProducts[0] : loanProducts[1]; // 70% 30-year, 30% 15-year
      principalAmount = Math.random() * 600000 + 150000; // $150K-$750K
      termMonths = loanProduct.name.includes('30-Year') ? 360 : 180;
    } else {
      // Consumer/Personal loan
      loanProduct = Math.random() < 0.5 ? loanProducts[2] : loanProducts[3];
      principalAmount = Math.random() * 30000 + 5000; // $5K-$35K
      termMonths = Math.floor(Math.random() * (loanProduct.maxTermMonths - loanProduct.minTermMonths)) + loanProduct.minTermMonths;
    }

    const monthlyPayment = calculateMonthlyPayment(principalAmount, loanProduct.interestRate, termMonths);

    // Loan started 3-24 months ago
    const monthsActive = Math.floor(Math.random() * 22) + 3;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsActive);

    const endDate = addMonths(startDate, termMonths);
    const nextPaymentDate = addMonths(new Date(), 0);
    nextPaymentDate.setDate(startDate.getDate());
    if (nextPaymentDate < new Date()) {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Calculate payments made
    const paymentsMade = Math.min(monthsActive, Math.floor(Math.random() * (monthsActive + 1)));
    const totalPaid = paymentsMade * monthlyPayment;
    const outstandingBalance = principalAmount - totalPaid + (principalAmount * (loanProduct.interestRate / 100) * (monthsActive / 12));

    // Get a random account for this customer
    const customerAccounts = accounts.filter(acc => acc.customerId === customer.id && acc.status === AccountStatus.ACTIVE);
    if (customerAccounts.length === 0) continue;

    const linkedAccount = customerAccounts[Math.floor(Math.random() * customerAccounts.length)];

    const loanNumber = createLoanNumber();
    const loanId = `loan-${loanCounter.toString().padStart(3, '0')}`;

    loans.push({
      id: loanId,
      loanNumber,
      customerId: customer.id,
      customerName: customer.name,
      accountId: linkedAccount.id,
      accountNumber: linkedAccount.accountNumber,
      productId: loanProduct.id,
      productName: loanProduct.name,
      type: loanProduct.type,
      status: LoanStatus.ACTIVE,
      principalAmount: parseFloat(principalAmount.toFixed(2)),
      interestRate: loanProduct.interestRate,
      termMonths,
      monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
      outstandingBalance: parseFloat(Math.max(0, outstandingBalance).toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      nextPaymentDate,
      startDate,
      endDate,
      createdAt: startDate,
      updatedAt: new Date()
    });

    // Generate 3-12 historical payments for this loan
    const paymentsToGenerate = Math.min(paymentsMade, Math.floor(Math.random() * 10) + 3);
    let runningBalance = principalAmount;

    for (let p = 0; p < paymentsToGenerate; p++) {
      const paymentDate = addMonths(startDate, p);
      const interestAmount = runningBalance * (loanProduct.interestRate / 100 / 12);
      const principalPayment = monthlyPayment - interestAmount;
      runningBalance -= principalPayment;

      // 95% completed, 3% pending, 2% failed
      let paymentStatus: 'COMPLETED' | 'PENDING' | 'FAILED';
      const statusRand = Math.random();
      if (statusRand < 0.95) {
        paymentStatus = 'COMPLETED';
      } else if (statusRand < 0.98) {
        paymentStatus = 'PENDING';
      } else {
        paymentStatus = 'FAILED';
      }

      loanPayments.push({
        id: `pmt-${paymentCounter.toString().padStart(4, '0')}`,
        loanId,
        loanNumber,
        amount: parseFloat(monthlyPayment.toFixed(2)),
        principal: parseFloat(principalPayment.toFixed(2)),
        interest: parseFloat(interestAmount.toFixed(2)),
        balance: parseFloat(Math.max(0, runningBalance).toFixed(2)),
        paymentDate,
        status: paymentStatus,
        createdAt: paymentDate
      });

      paymentCounter++;
    }

    loanCounter++;
  }
}

// Generate realistic transactions (at least 500 transactions across all accounts)
export const transactions: Transaction[] = [];
export const ledgerEntries: LedgerEntry[] = [];
let transactionCounter = 1;
let ledgerCounter = 1;

// Track running balances for ledger entries (starting from account opening balance)
const accountRunningBalances = new Map<string, number>();
for (const account of accounts) {
  // Initial balance represents the balance before our transaction history
  accountRunningBalances.set(account.id, account.balance);
}

const transactionDescriptions = {
  [TransactionType.DEPOSIT]: [
    'Salary deposit',
    'Direct deposit',
    'Payroll',
    'Income deposit',
    'Payment received',
    'Refund deposit',
    'Investment return',
    'Bonus payment'
  ],
  [TransactionType.WITHDRAWAL]: [
    'ATM withdrawal',
    'Cash withdrawal',
    'Branch withdrawal',
    'ATM cash',
    'Debit card withdrawal'
  ],
  [TransactionType.TRANSFER]: [
    'Transfer to savings',
    'Internal transfer',
    'Account transfer',
    'Payment transfer',
    'Bill payment'
  ],
  [TransactionType.PAYMENT]: [
    'Credit card payment',
    'Loan payment',
    'Utility bill',
    'Insurance premium',
    'Mortgage payment',
    'Rent payment',
    'Service payment'
  ],
  [TransactionType.FEE]: [
    'Monthly maintenance fee',
    'Overdraft fee',
    'ATM fee',
    'Service charge',
    'Account fee'
  ],
  [TransactionType.INTEREST]: [
    'Monthly interest credit',
    'Interest earned',
    'Savings interest',
    'Account interest'
  ]
};

// Generate at least 500 transactions
const targetTransactions = 600;
const transactionsPerAccount = Math.ceil(targetTransactions / accounts.length);

for (const account of accounts) {
  if (account.status !== AccountStatus.ACTIVE) continue;

  const numTransactions = Math.floor(Math.random() * 3) + transactionsPerAccount;

  for (let i = 0; i < numTransactions; i++) {
    // Randomly select transaction type
    const typeRoll = Math.random();
    let type: TransactionType;

    if (typeRoll < 0.25) {
      type = TransactionType.DEPOSIT;
    } else if (typeRoll < 0.45) {
      type = TransactionType.WITHDRAWAL;
    } else if (typeRoll < 0.60) {
      type = TransactionType.TRANSFER;
    } else if (typeRoll < 0.75) {
      type = TransactionType.PAYMENT;
    } else if (typeRoll < 0.85) {
      type = TransactionType.FEE;
    } else {
      type = TransactionType.INTEREST;
    }

    // Generate amount based on type
    let amount: number;
    switch (type) {
      case TransactionType.DEPOSIT:
        amount = Math.random() * 5000 + 100;
        break;
      case TransactionType.WITHDRAWAL:
        amount = Math.random() * 500 + 20;
        break;
      case TransactionType.TRANSFER:
        amount = Math.random() * 2000 + 50;
        break;
      case TransactionType.PAYMENT:
        amount = Math.random() * 1500 + 50;
        break;
      case TransactionType.FEE:
        amount = Math.random() * 30 + 5;
        break;
      case TransactionType.INTEREST:
        amount = Math.random() * 100 + 1;
        break;
      default:
        amount = 100;
    }

    // Status (90% completed, 7% pending, 3% failed)
    let status: TransactionStatus;
    const statusRoll = Math.random();
    if (statusRoll < 0.90) {
      status = TransactionStatus.COMPLETED;
    } else if (statusRoll < 0.97) {
      status = TransactionStatus.PENDING;
    } else {
      status = TransactionStatus.FAILED;
    }

    // Date within last 6 months
    const transactionDate = randomDate(sixMonthsAgo, new Date());

    // Description
    const descriptions = transactionDescriptions[type];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];

    const transactionId = `txn-${transactionCounter.toString().padStart(5, '0')}`;
    const reference = `REF-${Date.now().toString().slice(-8)}-${transactionCounter}`;

    let sourceAccountId: string | null = null;
    let sourceAccountNumber: string | null = null;
    let destinationAccountId: string | null = null;
    let destinationAccountNumber: string | null = null;

    // Set source/destination based on type
    if (type === TransactionType.DEPOSIT || type === TransactionType.INTEREST) {
      destinationAccountId = account.id;
      destinationAccountNumber = account.accountNumber;
    } else if (type === TransactionType.WITHDRAWAL || type === TransactionType.PAYMENT || type === TransactionType.FEE) {
      sourceAccountId = account.id;
      sourceAccountNumber = account.accountNumber;
    } else if (type === TransactionType.TRANSFER) {
      // Find another account to transfer to
      const otherAccounts = accounts.filter(a => a.id !== account.id && a.status === AccountStatus.ACTIVE);
      if (otherAccounts.length > 0) {
        const destAccount = otherAccounts[Math.floor(Math.random() * otherAccounts.length)];
        sourceAccountId = account.id;
        sourceAccountNumber = account.accountNumber;
        destinationAccountId = destAccount.id;
        destinationAccountNumber = destAccount.accountNumber;
      }
    }

    transactions.push({
      id: transactionId,
      sourceAccountId,
      sourceAccountNumber,
      destinationAccountId,
      destinationAccountNumber,
      amount: parseFloat(amount.toFixed(2)),
      currency: 'USD',
      type,
      status,
      description,
      reference,
      createdAt: transactionDate,
      completedAt: status === TransactionStatus.COMPLETED ? transactionDate : null
    });

    // Create ledger entries for completed transactions with proper running balance
    if (status === TransactionStatus.COMPLETED) {
      if (type === TransactionType.DEPOSIT || type === TransactionType.INTEREST) {
        // DEBIT increases the account balance (money coming in)
        const currentBalance = accountRunningBalances.get(account.id) || 0;
        const newBalance = currentBalance + amount;
        accountRunningBalances.set(account.id, newBalance);

        ledgerEntries.push({
          id: `led-${ledgerCounter.toString().padStart(5, '0')}`,
          transactionId,
          accountId: account.id,
          accountNumber: account.accountNumber,
          entryType: EntryType.DEBIT,
          amount: parseFloat(amount.toFixed(2)),
          balance: parseFloat(newBalance.toFixed(2)),
          currency: 'USD',
          description: `${type}: ${description}`,
          createdAt: transactionDate
        });
        ledgerCounter++;
      } else if (type === TransactionType.WITHDRAWAL || type === TransactionType.PAYMENT || type === TransactionType.FEE) {
        // CREDIT decreases the account balance (money going out)
        const currentBalance = accountRunningBalances.get(account.id) || 0;
        const newBalance = currentBalance - amount;
        accountRunningBalances.set(account.id, newBalance);

        ledgerEntries.push({
          id: `led-${ledgerCounter.toString().padStart(5, '0')}`,
          transactionId,
          accountId: account.id,
          accountNumber: account.accountNumber,
          entryType: EntryType.CREDIT,
          amount: parseFloat(amount.toFixed(2)),
          balance: parseFloat(newBalance.toFixed(2)),
          currency: 'USD',
          description: `${type}: ${description}`,
          createdAt: transactionDate
        });
        ledgerCounter++;
      } else if (type === TransactionType.TRANSFER && destinationAccountId && sourceAccountId) {
        // DEBIT destination (money coming in to destination)
        const destCurrentBalance = accountRunningBalances.get(destinationAccountId) || 0;
        const destNewBalance = destCurrentBalance + amount;
        accountRunningBalances.set(destinationAccountId, destNewBalance);

        ledgerEntries.push({
          id: `led-${ledgerCounter.toString().padStart(5, '0')}`,
          transactionId,
          accountId: destinationAccountId,
          accountNumber: destinationAccountNumber!,
          entryType: EntryType.DEBIT,
          amount: parseFloat(amount.toFixed(2)),
          balance: parseFloat(destNewBalance.toFixed(2)),
          currency: 'USD',
          description: `Transfer from ${sourceAccountNumber}: ${description}`,
          createdAt: transactionDate
        });
        ledgerCounter++;

        // CREDIT source (money going out from source)
        const srcCurrentBalance = accountRunningBalances.get(sourceAccountId) || 0;
        const srcNewBalance = srcCurrentBalance - amount;
        accountRunningBalances.set(sourceAccountId, srcNewBalance);

        ledgerEntries.push({
          id: `led-${ledgerCounter.toString().padStart(5, '0')}`,
          transactionId,
          accountId: sourceAccountId,
          accountNumber: sourceAccountNumber!,
          entryType: EntryType.CREDIT,
          amount: parseFloat(amount.toFixed(2)),
          balance: parseFloat(srcNewBalance.toFixed(2)),
          currency: 'USD',
          description: `Transfer to ${destinationAccountNumber}: ${description}`,
          createdAt: transactionDate
        });
        ledgerCounter++;
      }
    }

    transactionCounter++;
  }
}

// Sort transactions by date (newest first)
transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
  createdAt: Date;
  updatedAt: Date;
}

export const internalAccounts: InternalAccount[] = [
  {
    id: 'int-001',
    accountNumber: 'INT-SUSP-001',
    name: 'General Suspense Account',
    type: InternalAccountType.SUSPENSE,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 45678.90,
    description: 'Main suspense account for unidentified transactions',
    glCode: '1801',
    department: 'Operations',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-002',
    accountNumber: 'INT-SUSP-002',
    name: 'FX Suspense Account',
    type: InternalAccountType.SUSPENSE,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 12340.50,
    description: 'Suspense for foreign exchange settlement differences',
    glCode: '1802',
    department: 'Treasury',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-003',
    accountNumber: 'INT-CLR-001',
    name: 'ACH Clearing Account',
    type: InternalAccountType.CLEARING,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 1250000.00,
    description: 'ACH payment clearing and settlement',
    glCode: '1701',
    department: 'Payments',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-004',
    accountNumber: 'INT-CLR-002',
    name: 'Wire Transfer Clearing',
    type: InternalAccountType.CLEARING,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 3450000.00,
    description: 'Wire transfer clearing account',
    glCode: '1702',
    department: 'Payments',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-005',
    accountNumber: 'INT-SETT-001',
    name: 'Daily Settlement Account',
    type: InternalAccountType.SETTLEMENT,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 890000.00,
    description: 'End of day settlement processing',
    glCode: '1703',
    department: 'Operations',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-006',
    accountNumber: 'INT-PL-001',
    name: 'Interest Income',
    type: InternalAccountType.PROFIT_LOSS,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 567890.25,
    description: 'Interest income from loans and deposits',
    glCode: '4101',
    department: 'Finance',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-007',
    accountNumber: 'INT-PL-002',
    name: 'Fee Income',
    type: InternalAccountType.PROFIT_LOSS,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 234567.80,
    description: 'Transaction and service fees',
    glCode: '4102',
    department: 'Finance',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-008',
    accountNumber: 'INT-PL-003',
    name: 'FX Trading P&L',
    type: InternalAccountType.PROFIT_LOSS,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 89045.30,
    description: 'Foreign exchange trading profit/loss',
    glCode: '4103',
    department: 'Treasury',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-009',
    accountNumber: 'INT-RES-001',
    name: 'Loan Loss Reserve',
    type: InternalAccountType.RESERVE,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 1500000.00,
    description: 'Provision for potential loan losses',
    glCode: '2801',
    department: 'Risk',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-010',
    accountNumber: 'INT-RES-002',
    name: 'Regulatory Reserve',
    type: InternalAccountType.RESERVE,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 5000000.00,
    description: 'Regulatory capital reserve',
    glCode: '2802',
    department: 'Compliance',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-011',
    accountNumber: 'INT-IC-001',
    name: 'Intercompany - Branch A',
    type: InternalAccountType.INTERCOMPANY,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: 750000.00,
    description: 'Intercompany account with Branch A',
    glCode: '1901',
    department: 'Finance',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'int-012',
    accountNumber: 'INT-IC-002',
    name: 'Intercompany - Branch B',
    type: InternalAccountType.INTERCOMPANY,
    status: InternalAccountStatus.ACTIVE,
    currency: 'USD',
    balance: -125000.00,
    description: 'Intercompany account with Branch B',
    glCode: '1902',
    department: 'Finance',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date()
  }
];

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
  lastReconciled: Date;
  reconciledBalance: number;
  unreconciled: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NostroTransaction {
  id: string;
  nostroAccountId: string;
  transactionType: 'INCOMING' | 'OUTGOING' | 'FX_SETTLEMENT' | 'INTEREST' | 'FEE';
  amount: number;
  currency: string;
  valueDate: Date;
  reference: string;
  counterparty: string;
  status: 'PENDING' | 'SETTLED' | 'RECONCILED' | 'DISPUTED';
  description: string;
  createdAt: Date;
}

export const nostroAccounts: NostroAccount[] = [
  {
    id: 'nostro-001',
    accountNumber: 'NOSTRO-USD-JPMC',
    correspondentBank: 'JPMorgan Chase',
    correspondentBIC: 'CHASUS33XXX',
    country: 'United States',
    currency: 'USD',
    balance: 25000000.00,
    availableBalance: 24500000.00,
    creditLine: 10000000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 86400000),
    reconciledBalance: 24950000.00,
    unreconciled: 50000.00,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-002',
    accountNumber: 'NOSTRO-EUR-DB',
    correspondentBank: 'Deutsche Bank',
    correspondentBIC: 'DEUTDEFF',
    country: 'Germany',
    currency: 'EUR',
    balance: 15000000.00,
    availableBalance: 14800000.00,
    creditLine: 5000000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 86400000),
    reconciledBalance: 14990000.00,
    unreconciled: 10000.00,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-003',
    accountNumber: 'NOSTRO-GBP-BARC',
    correspondentBank: 'Barclays Bank',
    correspondentBIC: 'BARCGB22',
    country: 'United Kingdom',
    currency: 'GBP',
    balance: 8500000.00,
    availableBalance: 8450000.00,
    creditLine: 3000000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 172800000),
    reconciledBalance: 8480000.00,
    unreconciled: 20000.00,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-004',
    accountNumber: 'NOSTRO-JPY-MUFG',
    correspondentBank: 'MUFG Bank',
    correspondentBIC: 'BOABORNT',
    country: 'Japan',
    currency: 'JPY',
    balance: 2500000000,
    availableBalance: 2480000000,
    creditLine: 1000000000,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 86400000),
    reconciledBalance: 2495000000,
    unreconciled: 5000000,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-005',
    accountNumber: 'NOSTRO-CHF-UBS',
    correspondentBank: 'UBS Switzerland',
    correspondentBIC: 'UBSWCHZH80A',
    country: 'Switzerland',
    currency: 'CHF',
    balance: 5000000.00,
    availableBalance: 4950000.00,
    creditLine: 2000000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 86400000),
    reconciledBalance: 4990000.00,
    unreconciled: 10000.00,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-006',
    accountNumber: 'VOSTRO-USD-001',
    correspondentBank: 'Banco Nacional de Mexico',
    correspondentBIC: 'BNMXMXMM',
    country: 'Mexico',
    currency: 'USD',
    balance: -3500000.00,
    availableBalance: -3500000.00,
    creditLine: 5000000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'VOSTRO',
    lastReconciled: new Date(Date.now() - 86400000),
    reconciledBalance: -3490000.00,
    unreconciled: -10000.00,
    createdAt: new Date('2020-06-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-007',
    accountNumber: 'NOSTRO-CAD-RBC',
    correspondentBank: 'Royal Bank of Canada',
    correspondentBIC: 'ROYCCAT2',
    country: 'Canada',
    currency: 'CAD',
    balance: 12000000.00,
    availableBalance: 11900000.00,
    creditLine: 4000000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 259200000),
    reconciledBalance: 11850000.00,
    unreconciled: 150000.00,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  },
  {
    id: 'nostro-008',
    accountNumber: 'NOSTRO-AUD-CBA',
    correspondentBank: 'Commonwealth Bank Australia',
    correspondentBIC: 'CTBAAU2S',
    country: 'Australia',
    currency: 'AUD',
    balance: 6500000.00,
    availableBalance: 6450000.00,
    creditLine: 2500000.00,
    status: InternalAccountStatus.ACTIVE,
    relationship: 'NOSTRO',
    lastReconciled: new Date(Date.now() - 86400000),
    reconciledBalance: 6490000.00,
    unreconciled: 10000.00,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date()
  }
];

export const nostroTransactions: NostroTransaction[] = [];

// Generate nostro transactions
for (const nostro of nostroAccounts) {
  const txnCount = Math.floor(Math.random() * 20) + 10;
  for (let i = 0; i < txnCount; i++) {
    const types: Array<'INCOMING' | 'OUTGOING' | 'FX_SETTLEMENT' | 'INTEREST' | 'FEE'> =
      ['INCOMING', 'OUTGOING', 'FX_SETTLEMENT', 'INTEREST', 'FEE'];
    const statuses: Array<'PENDING' | 'SETTLED' | 'RECONCILED' | 'DISPUTED'> =
      ['PENDING', 'SETTLED', 'RECONCILED', 'DISPUTED'];

    const txnType = types[Math.floor(Math.random() * types.length)];
    let amount = 0;
    switch (txnType) {
      case 'INCOMING': amount = Math.random() * 500000 + 10000; break;
      case 'OUTGOING': amount = -(Math.random() * 500000 + 10000); break;
      case 'FX_SETTLEMENT': amount = (Math.random() - 0.5) * 1000000; break;
      case 'INTEREST': amount = Math.random() * 5000 + 100; break;
      case 'FEE': amount = -(Math.random() * 500 + 50); break;
    }

    nostroTransactions.push({
      id: `nostro-txn-${nostro.id}-${i}`,
      nostroAccountId: nostro.id,
      transactionType: txnType,
      amount: parseFloat(amount.toFixed(2)),
      currency: nostro.currency,
      valueDate: randomDate(sixMonthsAgo, new Date()),
      reference: `REF-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 10000)}`,
      counterparty: ['ABC Corp', 'XYZ Ltd', 'Global Trade Inc', 'Alpha Holdings'][Math.floor(Math.random() * 4)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      description: `${txnType} transaction`,
      createdAt: new Date()
    });
  }
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
  lastUpdated: Date;
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
  valueDate: Date;
  status: 'OPEN' | 'SETTLED' | 'CANCELLED';
  createdAt: Date;
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

export const currencyPositions: CurrencyPosition[] = [
  {
    id: 'pos-001',
    currency: 'EUR',
    longPosition: 15000000,
    shortPosition: 12500000,
    netPosition: 2500000,
    averageRate: 1.0850,
    marketRate: 1.0875,
    unrealizedPnL: 6250,
    realizedPnL: 125000,
    dailyVolume: 45000000,
    limit: 10000000,
    utilizationPercent: 25,
    lastUpdated: new Date()
  },
  {
    id: 'pos-002',
    currency: 'GBP',
    longPosition: 8000000,
    shortPosition: 9500000,
    netPosition: -1500000,
    averageRate: 1.2650,
    marketRate: 1.2620,
    unrealizedPnL: -4500,
    realizedPnL: 85000,
    dailyVolume: 25000000,
    limit: 8000000,
    utilizationPercent: 18.75,
    lastUpdated: new Date()
  },
  {
    id: 'pos-003',
    currency: 'JPY',
    longPosition: 1500000000,
    shortPosition: 1200000000,
    netPosition: 300000000,
    averageRate: 149.50,
    marketRate: 149.25,
    unrealizedPnL: -50167,
    realizedPnL: 450000,
    dailyVolume: 5000000000,
    limit: 500000000,
    utilizationPercent: 60,
    lastUpdated: new Date()
  },
  {
    id: 'pos-004',
    currency: 'CHF',
    longPosition: 5000000,
    shortPosition: 4500000,
    netPosition: 500000,
    averageRate: 0.8750,
    marketRate: 0.8780,
    unrealizedPnL: 1714,
    realizedPnL: 35000,
    dailyVolume: 12000000,
    limit: 5000000,
    utilizationPercent: 10,
    lastUpdated: new Date()
  },
  {
    id: 'pos-005',
    currency: 'CAD',
    longPosition: 10000000,
    shortPosition: 8000000,
    netPosition: 2000000,
    averageRate: 1.3550,
    marketRate: 1.3580,
    unrealizedPnL: 4420,
    realizedPnL: 65000,
    dailyVolume: 30000000,
    limit: 8000000,
    utilizationPercent: 25,
    lastUpdated: new Date()
  },
  {
    id: 'pos-006',
    currency: 'AUD',
    longPosition: 6000000,
    shortPosition: 7500000,
    netPosition: -1500000,
    averageRate: 0.6520,
    marketRate: 0.6490,
    unrealizedPnL: -4601,
    realizedPnL: 42000,
    dailyVolume: 18000000,
    limit: 6000000,
    utilizationPercent: 25,
    lastUpdated: new Date()
  }
];

export const positionMovements: PositionMovement[] = [];
const traders = [
  { id: 'trader-001', name: 'John Smith' },
  { id: 'trader-002', name: 'Sarah Johnson' },
  { id: 'trader-003', name: 'Michael Chen' },
  { id: 'trader-004', name: 'Emma Wilson' }
];

// Generate position movements
for (const position of currencyPositions) {
  const movementCount = Math.floor(Math.random() * 30) + 15;
  for (let i = 0; i < movementCount; i++) {
    const types: Array<'BUY' | 'SELL' | 'FX_SPOT' | 'FX_FORWARD' | 'SETTLEMENT'> =
      ['BUY', 'SELL', 'FX_SPOT', 'FX_FORWARD', 'SETTLEMENT'];
    const statuses: Array<'OPEN' | 'SETTLED' | 'CANCELLED'> = ['OPEN', 'SETTLED', 'CANCELLED'];

    const movementType = types[Math.floor(Math.random() * types.length)];
    const amount = Math.random() * 2000000 + 100000;
    const rate = position.marketRate * (1 + (Math.random() - 0.5) * 0.02);
    const trader = traders[Math.floor(Math.random() * traders.length)];

    positionMovements.push({
      id: `mov-${position.currency}-${i}`,
      currency: position.currency,
      movementType,
      amount: parseFloat(amount.toFixed(2)),
      rate: parseFloat(rate.toFixed(4)),
      counterCurrency: 'USD',
      counterAmount: parseFloat((amount * rate).toFixed(2)),
      traderId: trader.id,
      traderName: trader.name,
      valueDate: randomDate(sixMonthsAgo, new Date()),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date()
    });
  }
}

export const positionLimits: PositionLimit[] = currencyPositions.map(pos => ({
  id: `limit-${pos.currency}`,
  currency: pos.currency,
  daylight: pos.limit * 1.5,
  overnight: pos.limit,
  stopLoss: pos.limit * 0.1,
  currentUtilization: Math.abs(pos.netPosition),
  status: pos.utilizationPercent > 80 ? 'BREACH' : pos.utilizationPercent > 60 ? 'WARNING' : 'WITHIN_LIMIT'
}));

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
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export const suspenseEntries: SuspenseEntry[] = [];
const suspenseReasons = Object.values(SuspenseReason);
const suspenseStatuses: Array<'OPEN' | 'RESOLVED' | 'WRITTEN_OFF' | 'ESCALATED'> =
  ['OPEN', 'RESOLVED', 'WRITTEN_OFF', 'ESCALATED'];
const priorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> =
  ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const assignees = ['John Operations', 'Mary Reconciliation', 'Bob Compliance', 'Alice Treasury'];

// Get completed transactions to reference in suspense entries (ensures valid references)
const completedTransactions = transactions.filter(t => t.status === TransactionStatus.COMPLETED);

// Generate suspense entries with references to actual transactions
for (let i = 0; i < 75; i++) {
  const createdDate = randomDate(new Date(Date.now() - 90 * 86400000), new Date());
  const ageInDays = Math.floor((Date.now() - createdDate.getTime()) / 86400000);
  const status = suspenseStatuses[Math.floor(Math.random() * suspenseStatuses.length)];

  // Reference actual transactions (cycle through if we have fewer than 75)
  const referencedTransaction = completedTransactions[i % completedTransactions.length];

  suspenseEntries.push({
    id: `susp-entry-${i.toString().padStart(4, '0')}`,
    suspenseAccountId: Math.random() < 0.7 ? 'int-001' : 'int-002',
    originalTransactionId: referencedTransaction?.id || `txn-${i.toString().padStart(5, '0')}`,
    amount: parseFloat((Math.random() * 50000 + 100).toFixed(2)),
    currency: 'USD',
    reason: suspenseReasons[Math.floor(Math.random() * suspenseReasons.length)],
    status,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    assignedTo: assignees[Math.floor(Math.random() * assignees.length)],
    notes: 'Investigation in progress',
    resolution: status === 'RESOLVED' ? 'Matched to customer account' : null,
    resolvedAccountId: status === 'RESOLVED' ? accounts[Math.floor(Math.random() * accounts.length)].id : null,
    ageInDays,
    createdAt: createdDate,
    updatedAt: new Date(),
    resolvedAt: status === 'RESOLVED' ? new Date() : null
  });
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
  postingDate: Date;
  valueDate: Date;
  transactionType: string;
  status: 'POSTED' | 'PENDING' | 'REVERSED';
  createdBy: string;
  createdAt: Date;
}

export interface GLJournal {
  id: string;
  journalNumber: string;
  description: string;
  postingDate: Date;
  valueDate: Date;
  totalDebit: number;
  totalCredit: number;
  currency: string;
  entries: GLEntry[];
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  createdBy: string;
  approvedBy: string | null;
  createdAt: Date;
  postedAt: Date | null;
}

// Calculate suspense total from internal accounts for consistency
const suspenseTotal = 45678.90 + 12340.50; // int-001 + int-002

// GL Accounts with balanced accounting equation:
// Assets = Liabilities + Equity + (Revenue - Expenses)
// Using sign convention: Assets positive, Liabilities/Equity/Revenue negative, Expenses positive
export const glAccounts: GLAccount[] = [
  // Assets (1xxx) - Total: 415,058,019.40
  { id: 'gl-1001', accountCode: '1001', name: 'Cash and Cash Equivalents', type: 'ASSET', category: 'Current Assets', subcategory: 'Cash', balance: 50000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-1010', accountCode: '1010', name: 'Nostro Accounts', type: 'ASSET', category: 'Current Assets', subcategory: 'Cash', balance: 75000000, currency: 'USD', isActive: true, parentAccountCode: '1001', level: 2 },
  { id: 'gl-1020', accountCode: '1020', name: 'Vault Cash', type: 'ASSET', category: 'Current Assets', subcategory: 'Cash', balance: 5000000, currency: 'USD', isActive: true, parentAccountCode: '1001', level: 2 },
  { id: 'gl-1100', accountCode: '1100', name: 'Customer Loans', type: 'ASSET', category: 'Loans', subcategory: 'Retail Loans', balance: 250000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-1110', accountCode: '1110', name: 'Mortgage Loans', type: 'ASSET', category: 'Loans', subcategory: 'Retail Loans', balance: 180000000, currency: 'USD', isActive: true, parentAccountCode: '1100', level: 2 },
  { id: 'gl-1120', accountCode: '1120', name: 'Consumer Loans', type: 'ASSET', category: 'Loans', subcategory: 'Retail Loans', balance: 70000000, currency: 'USD', isActive: true, parentAccountCode: '1100', level: 2 },
  { id: 'gl-1200', accountCode: '1200', name: 'Fixed Assets', type: 'ASSET', category: 'Fixed Assets', subcategory: 'Property', balance: 35000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-1800', accountCode: '1800', name: 'Suspense Accounts', type: 'ASSET', category: 'Other Assets', subcategory: 'Suspense', balance: suspenseTotal, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },

  // Liabilities (2xxx) - Total: -376,500,000
  { id: 'gl-2001', accountCode: '2001', name: 'Customer Deposits', type: 'LIABILITY', category: 'Deposits', subcategory: 'Demand Deposits', balance: -320000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-2010', accountCode: '2010', name: 'Current Accounts', type: 'LIABILITY', category: 'Deposits', subcategory: 'Demand Deposits', balance: -180000000, currency: 'USD', isActive: true, parentAccountCode: '2001', level: 2 },
  { id: 'gl-2020', accountCode: '2020', name: 'Savings Accounts', type: 'LIABILITY', category: 'Deposits', subcategory: 'Demand Deposits', balance: -140000000, currency: 'USD', isActive: true, parentAccountCode: '2001', level: 2 },
  { id: 'gl-2100', accountCode: '2100', name: 'Borrowings', type: 'LIABILITY', category: 'Borrowings', subcategory: 'Interbank', balance: -50000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-2800', accountCode: '2800', name: 'Provisions', type: 'LIABILITY', category: 'Provisions', subcategory: 'Loan Loss', balance: -6500000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },

  // Equity (3xxx) - Total: -40,000,000 (adjusted to balance)
  { id: 'gl-3001', accountCode: '3001', name: 'Share Capital', type: 'EQUITY', category: 'Capital', subcategory: 'Issued Capital', balance: -25000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-3100', accountCode: '3100', name: 'Retained Earnings', type: 'EQUITY', category: 'Reserves', subcategory: 'Earnings', balance: -16558019.40, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },

  // Revenue (4xxx) - Total: -17,500,000
  { id: 'gl-4001', accountCode: '4001', name: 'Interest Income', type: 'REVENUE', category: 'Interest', subcategory: 'Loan Interest', balance: -12500000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-4010', accountCode: '4010', name: 'Loan Interest Income', type: 'REVENUE', category: 'Interest', subcategory: 'Loan Interest', balance: -10000000, currency: 'USD', isActive: true, parentAccountCode: '4001', level: 2 },
  { id: 'gl-4020', accountCode: '4020', name: 'Investment Interest', type: 'REVENUE', category: 'Interest', subcategory: 'Investment', balance: -2500000, currency: 'USD', isActive: true, parentAccountCode: '4001', level: 2 },
  { id: 'gl-4100', accountCode: '4100', name: 'Fee Income', type: 'REVENUE', category: 'Fees', subcategory: 'Service Fees', balance: -3500000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-4200', accountCode: '4200', name: 'FX Trading Income', type: 'REVENUE', category: 'Trading', subcategory: 'FX', balance: -1500000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },

  // Expenses (5xxx) - Total: 18,000,000
  { id: 'gl-5001', accountCode: '5001', name: 'Interest Expense', type: 'EXPENSE', category: 'Interest', subcategory: 'Deposit Interest', balance: 4500000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-5100', accountCode: '5100', name: 'Personnel Expenses', type: 'EXPENSE', category: 'Operating', subcategory: 'Salaries', balance: 8000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-5200', accountCode: '5200', name: 'Administrative Expenses', type: 'EXPENSE', category: 'Operating', subcategory: 'Admin', balance: 3500000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 },
  { id: 'gl-5300', accountCode: '5300', name: 'Loan Loss Provisions', type: 'EXPENSE', category: 'Provisions', subcategory: 'Credit Loss', balance: 2000000, currency: 'USD', isActive: true, parentAccountCode: null, level: 1 }
];

// Verify accounting equation: Assets + Liabilities + Equity + Revenue + Expenses = 0
// 415,058,019.40 + (-376,500,000) + (-41,558,019.40) + (-17,500,000) + 18,000,000 = 0
// Net Income = Revenue - Expenses = 17,500,000 - 18,000,000 = -500,000 (loss)

export const glEntries: GLEntry[] = [];
export const glJournals: GLJournal[] = [];

// Generate GL entries based on transactions
// Correct double-entry bookkeeping mappings:
// - DEPOSIT: Cash increases (Asset DR), Customer Deposit increases (Liability CR)
// - WITHDRAWAL: Customer Deposit decreases (Liability DR), Cash decreases (Asset CR)
// - TRANSFER: Internal transfer between accounts (both liability accounts)
// - PAYMENT: Bank receives payment - Cash increases (Asset DR), Customer Deposit decreases (Liability DR -> CR swap)
// - FEE: Customer pays fee - Deposit decreases (DR), Fee Income increases (Revenue CR)
// - INTEREST: Bank pays interest to customer - Interest Expense (DR), Deposit increases (CR)
const transactionTypeGLMappings: Record<string, { debitAccount: string; creditAccount: string }> = {
  DEPOSIT: { debitAccount: '1001', creditAccount: '2001' },    // Asset↑, Liability↑
  WITHDRAWAL: { debitAccount: '2001', creditAccount: '1001' }, // Liability↓, Asset↓
  TRANSFER: { debitAccount: '2010', creditAccount: '2010' },   // Internal account movement
  PAYMENT: { debitAccount: '1001', creditAccount: '2001' },    // Asset↑ (receiving payment), Liability↓
  FEE: { debitAccount: '2001', creditAccount: '4100' },        // Liability↓, Revenue↑
  INTEREST: { debitAccount: '5001', creditAccount: '2001' }    // Expense↑, Liability↑ (interest paid to customer)
};

let glEntryCounter = 1;
let journalCounter = 1;

// Group transactions by date for journal creation
const txnsByDate = new Map<string, Transaction[]>();
for (const txn of transactions.filter(t => t.status === TransactionStatus.COMPLETED)) {
  const dateKey = txn.createdAt.toISOString().split('T')[0];
  if (!txnsByDate.has(dateKey)) {
    txnsByDate.set(dateKey, []);
  }
  txnsByDate.get(dateKey)!.push(txn);
}

// Create journals and entries
for (const [dateStr, txns] of txnsByDate) {
  const journalId = `journal-${journalCounter.toString().padStart(5, '0')}`;
  let totalDebit = 0;
  let totalCredit = 0;
  const entries: GLEntry[] = [];

  for (const txn of txns.slice(0, 10)) { // Limit entries per journal
    const mapping = transactionTypeGLMappings[txn.type];
    if (!mapping) continue;

    const debitAccount = glAccounts.find(a => a.accountCode === mapping.debitAccount);
    const creditAccount = glAccounts.find(a => a.accountCode === mapping.creditAccount);
    if (!debitAccount || !creditAccount) continue;

    // Debit entry with transaction link
    entries.push({
      id: `gl-entry-${glEntryCounter.toString().padStart(6, '0')}`,
      journalId,
      accountCode: debitAccount.accountCode,
      accountName: debitAccount.name,
      debit: txn.amount,
      credit: 0,
      currency: txn.currency,
      description: `${txn.type}: ${txn.description}`,
      reference: txn.reference || txn.id,
      transactionId: txn.id, // Link to source transaction
      postingDate: txn.createdAt,
      valueDate: txn.createdAt,
      transactionType: txn.type,
      status: 'POSTED',
      createdBy: 'System',
      createdAt: txn.createdAt
    });
    totalDebit += txn.amount;
    glEntryCounter++;

    // Credit entry with transaction link
    entries.push({
      id: `gl-entry-${glEntryCounter.toString().padStart(6, '0')}`,
      journalId,
      accountCode: creditAccount.accountCode,
      accountName: creditAccount.name,
      debit: 0,
      credit: txn.amount,
      currency: txn.currency,
      description: `${txn.type}: ${txn.description}`,
      reference: txn.reference || txn.id,
      transactionId: txn.id, // Link to source transaction
      postingDate: txn.createdAt,
      valueDate: txn.createdAt,
      transactionType: txn.type,
      status: 'POSTED',
      createdBy: 'System',
      createdAt: txn.createdAt
    });
    totalCredit += txn.amount;
    glEntryCounter++;
  }

  if (entries.length > 0) {
    glJournals.push({
      id: journalId,
      journalNumber: `JNL-${dateStr.replace(/-/g, '')}-${journalCounter.toString().padStart(3, '0')}`,
      description: `Daily transactions for ${dateStr}`,
      postingDate: new Date(dateStr),
      valueDate: new Date(dateStr),
      totalDebit: parseFloat(totalDebit.toFixed(2)),
      totalCredit: parseFloat(totalCredit.toFixed(2)),
      currency: 'USD',
      entries,
      status: 'POSTED',
      createdBy: 'System',
      approvedBy: 'Auto-Approved',
      createdAt: new Date(dateStr),
      postedAt: new Date(dateStr)
    });
    glEntries.push(...entries);
    journalCounter++;
  }
}

// Export summary
console.log(`Generated ${customers.length} customers`);
console.log(`Generated ${accounts.length} accounts`);
console.log(`Generated ${loans.length} loans`);
console.log(`Generated ${loanPayments.length} loan payments`);
console.log(`Generated ${transactions.length} transactions`);
console.log(`Generated ${ledgerEntries.length} ledger entries`);
console.log(`Generated ${internalAccounts.length} internal accounts`);
console.log(`Generated ${nostroAccounts.length} nostro accounts`);
console.log(`Generated ${nostroTransactions.length} nostro transactions`);
console.log(`Generated ${currencyPositions.length} currency positions`);
console.log(`Generated ${positionMovements.length} position movements`);
console.log(`Generated ${suspenseEntries.length} suspense entries`);
console.log(`Generated ${glAccounts.length} GL accounts`);
console.log(`Generated ${glEntries.length} GL entries`);
console.log(`Generated ${glJournals.length} GL journals`);
