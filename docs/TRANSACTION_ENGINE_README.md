# Transaction Processing Engine

## Overview

The transaction processing engine is a core component of the banking system that handles all financial transactions with proper validation, state management, and idempotency support.

## Components

### 1. Transaction Entity (`transaction.ts`)

The `Transaction` class is the main entity representing a financial transaction with full lifecycle management.

**Key Features:**
- Immutable transaction properties (id, type, amount, accounts)
- State transitions (PENDING → PROCESSING → COMPLETED/FAILED/REVERSED)
- Validation methods for amounts and currencies
- Reversal capability with business rules
- Idempotency support
- Full audit trail with timestamps

**Transaction States:**
- `PENDING`: Initial state, awaiting processing
- `PROCESSING`: Transaction is being executed
- `COMPLETED`: Successfully completed
- `FAILED`: Failed during processing
- `REVERSED`: Successfully reversed
- `REJECTED`: Rejected during validation
- `ON_HOLD`: Held for review

**Key Methods:**
```typescript
// State transitions
markAsProcessing(): void
markAsCompleted(): void
markAsFailed(reason: string): void
markAsReversed(reversalTransactionId: string): void

// Validation
validateAmount(): ValidationResult
validateCurrency(expectedCurrency: Currency): ValidationResult

// Reversal checking
isReversible(): boolean
getReversalBlockReason(): string | null

// State checking
isFinal(): boolean
isInProgress(): boolean
```

**Reversal Rules:**
- Only COMPLETED transactions can be reversed
- Cannot reverse already reversed transactions
- Reversal transactions themselves cannot be reversed
- Maximum reversal window: 90 days after completion

### 2. Transaction Processor (`transaction-processor.ts`)

The `TransactionProcessor` class orchestrates transaction execution with proper validation, error handling, and rollback capabilities.

**Key Features:**
- Idempotency handling using unique keys
- Automatic validation before execution
- Integration with ledger for double-entry bookkeeping
- Rollback on failure
- Support for multiple transaction types

**Supported Transaction Types:**

#### Transfer
```typescript
processTransfer(
  fromAccountId: string,
  toAccountId: string,
  amount: Money,
  reference?: string,
  idempotencyKey?: string
): Promise<Transaction>
```

Transfers money between two accounts with:
- Source account validation (active status, sufficient funds)
- Destination account validation (can receive funds)
- Currency matching
- Daily limit checks

#### Deposit
```typescript
processDeposit(
  accountId: string,
  amount: Money,
  reference?: string,
  idempotencyKey?: string
): Promise<Transaction>
```

Deposits money into an account with:
- Account validation (can receive funds)
- Amount validation

#### Withdrawal
```typescript
processWithdrawal(
  accountId: string,
  amount: Money,
  reference?: string,
  idempotencyKey?: string
): Promise<Transaction>
```

Withdraws money from an account with:
- Account validation (active status)
- Sufficient funds check
- Daily withdrawal limit check

#### Reversal
```typescript
reverseTransaction(
  transactionId: string,
  reason: string,
  idempotencyKey?: string
): Promise<Transaction>
```

Reverses a completed transaction with:
- Reversibility validation
- Opposite ledger entries
- Original transaction marking

**Configuration Options:**
```typescript
interface TransactionProcessorOptions {
  enableIdempotency?: boolean;  // Default: true
  maxRetries?: number;          // Default: 3
  retryDelayMs?: number;        // Default: 100
}
```

### 3. Transaction Validator (`transaction-validator.ts`)

The `TransactionValidator` class provides comprehensive validation for all transaction types.

**Validation Methods:**

#### Amount Validation
```typescript
validateAmount(amount: Money): boolean
```
- Checks for positive amount
- Validates decimal precision based on currency scale
- Enforces maximum transaction limit (1 million)

#### Account Validation
```typescript
validateAccounts(sourceId: string, destId: string): Promise<boolean>
validateAccount(accountId: string, allowInactive?: boolean): Promise<Account>
```
- Verifies account existence
- Checks account status
- Validates currency compatibility

#### Funds Validation
```typescript
validateSufficientFunds(accountId: string, amount: Money): Promise<boolean>
```
- Checks available balance (includes overdraft)
- Validates currency match

#### Limit Validation
```typescript
validateDailyLimits(accountId: string, amount: Money): Promise<boolean>
validateDailyWithdrawalLimit(accountId: string, amount: Money): Promise<boolean>
```
- Enforces daily transfer limits
- Enforces daily withdrawal limits
- Accumulates daily totals

#### Comprehensive Validation
```typescript
validateTransfer(sourceId: string, destId: string, amount: Money): Promise<ValidationResult>
validateDeposit(accountId: string, amount: Money): Promise<ValidationResult>
validateWithdrawal(accountId: string, amount: Money): Promise<ValidationResult>
```

Each returns a `ValidationResult` with:
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

## Error Handling

The engine defines specific error types for different scenarios:

```typescript
// Account errors
AccountNotFoundError
AccountInactiveError

// Amount errors
InvalidAmountError
CurrencyMismatchError
InsufficientFundsError

// Limit errors
DailyLimitExceededError

// Transaction errors
TransactionNotFoundError
TransactionAlreadyProcessedError
TransactionNotReversibleError
InvalidTransactionStateError

// Validation errors
ValidationError
```

## Integration Points

### Required Dependencies

#### AccountRepository Interface
```typescript
interface AccountRepository {
  findById(accountId: string): Promise<Account | null>;
  getBalance(accountId: string): Promise<Balance | null>;
  getDailyTransactionTotal(accountId: string, date: Date): Promise<Money>;
  getDailyWithdrawalTotal(accountId: string, date: Date): Promise<Money>;
  getTransactionLimits(productId: string): Promise<{
    dailyTransferLimit?: Money;
    dailyWithdrawalLimit?: Money;
  }>;
}
```

#### TransactionRepository Interface
```typescript
interface TransactionRepository {
  save(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findByIdempotencyKey(key: string): Promise<Transaction | null>;
  update(transaction: Transaction): Promise<Transaction>;
}
```

#### LedgerService Interface
```typescript
interface LedgerService {
  recordDebit(accountId: string, amount: Money, transactionId: string): Promise<void>;
  recordCredit(accountId: string, amount: Money, transactionId: string): Promise<void>;
  rollback(transactionId: string): Promise<void>;
}
```

## Usage Examples

### Basic Transfer
```typescript
const processor = new TransactionProcessor(
  transactionRepo,
  accountRepo,
  ledgerService,
  validator
);

const amount: Money = {
  amount: 10000,  // $100.00 in cents
  currency: Currency.USD,
  scale: 2
};

const transaction = await processor.processTransfer(
  'account-123',
  'account-456',
  amount,
  'Monthly rent payment'
);
```

### Idempotent Deposit
```typescript
const idempotencyKey = 'deposit-2024-001';

const transaction = await processor.processDeposit(
  'account-123',
  amount,
  'Payroll deposit',
  idempotencyKey
);

// Calling again with same key returns the same transaction
const sameTransaction = await processor.processDeposit(
  'account-123',
  amount,
  'Payroll deposit',
  idempotencyKey
);
```

### Transaction Reversal
```typescript
try {
  const reversal = await processor.reverseTransaction(
    'txn-789',
    'Customer dispute - duplicate charge'
  );
  console.log(`Transaction reversed: ${reversal.id}`);
} catch (error) {
  if (error instanceof TransactionNotReversibleError) {
    console.log(`Cannot reverse: ${error.message}`);
  }
}
```

### Validation Before Processing
```typescript
const validationResult = await validator.validateTransfer(
  'account-123',
  'account-456',
  amount
);

if (!validationResult.isValid) {
  console.log('Validation errors:');
  validationResult.errors.forEach(error => console.log(`- ${error}`));
} else {
  // Proceed with transaction
  const transaction = await processor.processTransfer(...);
}
```

## Money Utilities

The engine uses utility functions for Money operations (since Money is an interface):

```typescript
import { createMoney, addMoney, formatMoney, isGreaterThan } from '../core/money-utils';

// Create money
const amount = createMoney(10000, Currency.USD, 2); // $100.00

// Add amounts
const total = addMoney(amount1, amount2);

// Format for display
const display = formatMoney(amount); // "USD 100.00"

// Compare amounts
if (isGreaterThan(balance, amount)) {
  // Sufficient funds
}
```

## State Transition Diagram

```
                    ┌─────────┐
                    │ PENDING │
                    └────┬────┘
                         │
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
         ┌────────────┐        ┌────────┐
         │ PROCESSING │        │ FAILED │
         └─────┬──────┘        └────────┘
               │
     ┌─────────┼─────────┐
     ↓         ↓         ↓
┌────────┐ ┌───────────┐ ┌─────────┐
│ FAILED │ │ COMPLETED │ │ ON_HOLD │
└────────┘ └─────┬─────┘ └────┬────┘
                 │              │
                 ↓              ↓
            ┌──────────┐   ┌──────────┐
            │ REVERSED │   │ REJECTED │
            └──────────┘   └──────────┘
```

## Best Practices

1. **Always use idempotency keys** for API-initiated transactions
2. **Validate before processing** to provide early feedback
3. **Handle errors gracefully** with user-friendly messages
4. **Log all transactions** for audit and debugging
5. **Use Money utilities** instead of direct arithmetic operations
6. **Check reversibility** before attempting reversals
7. **Set appropriate limits** based on account type and risk profile
8. **Monitor daily limits** to prevent abuse

## Performance Considerations

- **Idempotency cache**: Implement caching for idempotency key lookups
- **Batch operations**: For bulk transactions, use batch processing
- **Async validation**: Run independent validations in parallel
- **Connection pooling**: Use database connection pools for repositories
- **Retry logic**: Configure appropriate retry settings for transient failures

## Security Considerations

- **Authorization**: Verify user permissions before processing
- **Rate limiting**: Implement rate limits per account/user
- **Fraud detection**: Integrate with fraud detection systems
- **Audit logging**: Log all transaction attempts and outcomes
- **Encryption**: Encrypt sensitive transaction metadata
- **Input validation**: Sanitize all inputs to prevent injection attacks

## Testing

The engine is designed to be fully testable with:
- Unit tests for Transaction class methods
- Integration tests for TransactionProcessor
- Mock implementations for repositories and ledger
- Test scenarios for all transaction types and error cases

## Future Enhancements

- **Scheduled transactions**: Support for future-dated transactions
- **Recurring transactions**: Automatic recurring payments
- **Multi-currency**: Foreign exchange transactions
- **Batch processing**: Bulk transaction processing
- **Webhooks**: Event notifications for transaction state changes
- **Analytics**: Transaction analytics and reporting
