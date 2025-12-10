# Double-Entry Bookkeeping Ledger System

## Overview

This ledger system implements a robust double-entry bookkeeping system for core banking operations. Every transaction creates exactly one debit entry and one credit entry, ensuring that the sum of all debits always equals the sum of all credits.

## Architecture

### Components

1. **LedgerEntry** - Represents a single entry in the ledger
2. **Ledger** - Manages the collection of entries and enforces double-entry rules
3. **LedgerService** - High-level service for transaction recording and account reconciliation

### Double-Entry Bookkeeping Principles

The system follows these fundamental accounting principles:

- **Every transaction has two sides**: A debit and a credit
- **Debits must equal credits**: For every transaction, the sum of debits equals the sum of credits
- **Account types**:
  - **Assets** (Cash, Accounts Receivable): Increase with debits, decrease with credits
  - **Liabilities** (Loans, Accounts Payable): Increase with credits, decrease with debits
  - **Equity**: Increases with credits, decreases with debits
  - **Revenue**: Increases with credits
  - **Expenses**: Increase with debits

## Core Features

### LedgerEntry Class

```typescript
const entry = new LedgerEntry({
  transactionId: 'txn-123',
  accountId: 'acc-456',
  entryType: EntryType.DEBIT,
  amount: 100.00,
  currency: 'USD',
  description: 'Customer deposit'
});
```

**Features:**
- Automatic ID generation using UUID
- Comprehensive validation (amount, currency, entry type)
- Amount normalization to 2 decimal places
- Formatted display output
- Reversal entry creation
- JSON serialization

### Ledger Class

```typescript
const ledger = new Ledger();
ledger.addEntry(debitEntry);
ledger.addEntry(creditEntry);

// Validate double-entry
ledger.validateDoubleEntry(debitEntry, creditEntry);

// Calculate account balance
const balance = ledger.calculateBalance('acc-456');
// Returns: { debit: 100.00, credit: 50.00, net: -50.00 }
```

**Features:**
- Entry management with validation
- Account balance calculation
- Transaction entry retrieval
- Date range queries
- Ledger integrity verification
- Summary statistics

### LedgerService Class

```typescript
const service = new LedgerService();

// Record a completed transaction
const entries = service.recordTransaction({
  id: 'txn-123',
  type: TransactionType.DEPOSIT,
  status: TransactionStatus.COMPLETED,
  amount: 100.00,
  currency: 'USD',
  destinationAccountId: 'acc-456',
  description: 'Cash deposit'
});

// Get account statement
const statement = service.getAccountStatement(
  'acc-456',
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

// Reconcile account
const reconciliation = service.reconcileAccount('acc-456');
```

**Features:**
- Transaction recording with automatic double-entry creation
- Support for all transaction types (deposit, withdrawal, transfer, etc.)
- Account statement generation
- Account reconciliation
- Business rule enforcement

## Transaction Types and Accounting Rules

### 1. Deposit

```
Debit:  Destination Account (Asset ↑)
Credit: External/Source Account
```

### 2. Withdrawal

```
Debit:  External/Cash Account
Credit: Source Account (Asset ↓)
```

### 3. Transfer

```
Debit:  Destination Account (Asset ↑)
Credit: Source Account (Asset ↓)
```

### 4. Payment

```
Debit:  Payment Expense Account
Credit: Source Account (Asset ↓)
```

### 5. Fee

```
Debit:  Fee Revenue Account (Revenue ↑)
Credit: Customer Account (Asset ↓)
```

### 6. Interest

```
Debit:  Customer Account (Asset ↑)
Credit: Interest Expense Account
```

### 7. Adjustment

```
Positive: Debit Account, Credit Adjustment Account
Negative: Credit Account, Debit Adjustment Account
```

## Error Handling

The system provides comprehensive error handling:

- **ValidationError**: Invalid input data
- **DoubleEntryViolationError**: Double-entry rules violated
- **InsufficientFundsError**: Insufficient account balance
- **AccountNotFoundError**: Account does not exist

## Usage Examples

### Complete Transaction Flow

```typescript
import { LedgerService, LedgerEntry } from './ledger';
import { Transaction, TransactionType, TransactionStatus, EntryType } from '../core/domain';

// Initialize service
const ledgerService = new LedgerService();

// Create a deposit transaction
const transaction: Transaction = {
  id: 'txn-001',
  type: TransactionType.DEPOSIT,
  status: TransactionStatus.COMPLETED,
  amount: 500.00,
  currency: 'USD',
  destinationAccountId: 'acc-123',
  description: 'Initial deposit',
  createdAt: new Date(),
  completedAt: new Date()
};

// Record transaction (creates debit and credit entries)
const entries = ledgerService.recordTransaction(transaction);

console.log('Entries created:', entries.length); // 2
console.log('Entry 1:', entries[0].format());
console.log('Entry 2:', entries[1].format());

// Get account statement
const statement = ledgerService.getAccountStatement(
  'acc-123',
  new Date('2025-01-01'),
  new Date('2025-12-31')
);

console.log('Statement entries:', statement.length);

// Reconcile account
const reconciliation = ledgerService.reconcileAccount('acc-123');
console.log('Account balanced:', reconciliation.isBalanced);
console.log('Net balance:', reconciliation.netBalance);
```

### Transfer Between Accounts

```typescript
const transferTransaction: Transaction = {
  id: 'txn-002',
  type: TransactionType.TRANSFER,
  status: TransactionStatus.COMPLETED,
  amount: 250.00,
  currency: 'USD',
  sourceAccountId: 'acc-123',
  destinationAccountId: 'acc-456',
  description: 'Transfer to savings',
  createdAt: new Date(),
  completedAt: new Date()
};

const transferEntries = ledgerService.recordTransaction(transferTransaction);

// Source account: Credited (decreased)
// Destination account: Debited (increased)
```

### Ledger Verification

```typescript
const ledger = ledgerService.getLedger();

// Get summary
const summary = ledger.getSummary();
console.log('Total entries:', summary.totalEntries);
console.log('Total debits:', summary.totalDebits);
console.log('Total credits:', summary.totalCredits);
console.log('Balanced:', summary.totalDebits === summary.totalCredits);

// Verify entire ledger
const isBalanced = ledger.verifyLedgerBalance();
console.log('Ledger verified:', isBalanced);
```

## Best Practices

1. **Always use completed transactions**: Only record transactions with `COMPLETED` status
2. **Validate before recording**: Ensure all required fields are present
3. **Regular reconciliation**: Reconcile accounts frequently to detect discrepancies
4. **Audit trail**: Keep all ledger entries immutable for audit purposes
5. **Currency consistency**: Ensure all entries in a transaction use the same currency
6. **Error handling**: Wrap operations in try-catch blocks
7. **Date range queries**: Use appropriate date ranges for performance

## Testing Considerations

- Test double-entry validation
- Test all transaction types
- Test balance calculations
- Test date range queries
- Test error conditions
- Test ledger reconciliation
- Test floating-point precision handling

## Performance Considerations

- Use date range queries to limit result sets
- Consider pagination for large account statements
- Index entries by account and transaction for faster lookups
- Implement caching for frequently accessed accounts

## Future Enhancements

- Multi-currency support with exchange rates
- Batch transaction processing
- Async transaction recording
- Database persistence layer
- Transaction reversals and corrections
- Advanced reporting and analytics
- Audit log integration
- Real-time balance updates
