/**
 * Ledger System Usage Examples
 * Demonstrates the double-entry bookkeeping system in action
 */

import { LedgerService } from '../src/ledger/ledger-service';
import { Ledger } from '../src/ledger/ledger';
import { LedgerEntry } from '../src/ledger/ledger-entry';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
  EntryType
} from '../src/core/domain';

// Example 1: Simple Deposit Transaction
function example1_SimpleDeposit() {
  console.log('\n=== Example 1: Simple Deposit ===\n');

  const ledgerService = new LedgerService();

  const depositTransaction: Transaction = {
    id: 'txn-001',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.COMPLETED,
    amount: 1000.00,
    currency: 'USD',
    destinationAccountId: 'acc-customer-001',
    description: 'Initial deposit - Cash',
    createdAt: new Date(),
    completedAt: new Date()
  };

  const entries = ledgerService.recordTransaction(depositTransaction);

  console.log('Transaction recorded successfully!');
  console.log(`Created ${entries.length} ledger entries:\n`);

  entries.forEach((entry, index) => {
    console.log(`Entry ${index + 1}:`);
    console.log(entry.format());
    console.log();
  });

  // Check account balance
  const ledger = ledgerService.getLedger();
  const balance = ledger.calculateBalance('acc-customer-001');
  console.log('Account Balance:');
  console.log(`  Total Debits:  $${balance.debit.toFixed(2)}`);
  console.log(`  Total Credits: $${balance.credit.toFixed(2)}`);
  console.log(`  Net Balance:   $${balance.net.toFixed(2)}`);
}

// Example 2: Transfer Between Accounts
function example2_Transfer() {
  console.log('\n=== Example 2: Transfer Between Accounts ===\n');

  const ledgerService = new LedgerService();

  // Initial deposits
  const deposit1: Transaction = {
    id: 'txn-002',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.COMPLETED,
    amount: 5000.00,
    currency: 'USD',
    destinationAccountId: 'acc-checking-001',
    description: 'Initial checking deposit',
    createdAt: new Date(),
    completedAt: new Date()
  };

  const deposit2: Transaction = {
    id: 'txn-003',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.COMPLETED,
    amount: 2000.00,
    currency: 'USD',
    destinationAccountId: 'acc-savings-001',
    description: 'Initial savings deposit',
    createdAt: new Date(),
    completedAt: new Date()
  };

  ledgerService.recordTransaction(deposit1);
  ledgerService.recordTransaction(deposit2);

  // Transfer from checking to savings
  const transfer: Transaction = {
    id: 'txn-004',
    type: TransactionType.TRANSFER,
    status: TransactionStatus.COMPLETED,
    amount: 1500.00,
    currency: 'USD',
    sourceAccountId: 'acc-checking-001',
    destinationAccountId: 'acc-savings-001',
    description: 'Transfer to savings',
    createdAt: new Date(),
    completedAt: new Date()
  };

  const transferEntries = ledgerService.recordTransaction(transfer);

  console.log('Transfer completed!\n');
  transferEntries.forEach(entry => {
    console.log(entry.format());
  });

  // Check balances
  const ledger = ledgerService.getLedger();
  const checkingBalance = ledger.calculateBalance('acc-checking-001');
  const savingsBalance = ledger.calculateBalance('acc-savings-001');

  console.log('\n--- Account Balances ---');
  console.log(`Checking Account: $${checkingBalance.net.toFixed(2)}`);
  console.log(`Savings Account:  $${savingsBalance.net.toFixed(2)}`);
}

// Example 3: Multiple Transaction Types
function example3_MultipleTransactions() {
  console.log('\n=== Example 3: Multiple Transaction Types ===\n');

  const ledgerService = new LedgerService();
  const accountId = 'acc-main-001';

  // 1. Initial deposit
  ledgerService.recordTransaction({
    id: 'txn-005',
    type: TransactionType.DEPOSIT,
    status: TransactionStatus.COMPLETED,
    amount: 10000.00,
    currency: 'USD',
    destinationAccountId: accountId,
    description: 'Opening deposit',
    createdAt: new Date('2025-01-01'),
    completedAt: new Date('2025-01-01')
  });

  // 2. Withdrawal
  ledgerService.recordTransaction({
    id: 'txn-006',
    type: TransactionType.WITHDRAWAL,
    status: TransactionStatus.COMPLETED,
    amount: 500.00,
    currency: 'USD',
    sourceAccountId: accountId,
    description: 'ATM withdrawal',
    createdAt: new Date('2025-01-05'),
    completedAt: new Date('2025-01-05')
  });

  // 3. Payment
  ledgerService.recordTransaction({
    id: 'txn-007',
    type: TransactionType.PAYMENT,
    status: TransactionStatus.COMPLETED,
    amount: 150.00,
    currency: 'USD',
    sourceAccountId: accountId,
    description: 'Utility bill payment',
    createdAt: new Date('2025-01-10'),
    completedAt: new Date('2025-01-10')
  });

  // 4. Fee
  ledgerService.recordTransaction({
    id: 'txn-008',
    type: TransactionType.FEE,
    status: TransactionStatus.COMPLETED,
    amount: 15.00,
    currency: 'USD',
    sourceAccountId: accountId,
    description: 'Monthly maintenance fee',
    createdAt: new Date('2025-01-15'),
    completedAt: new Date('2025-01-15')
  });

  // 5. Interest
  ledgerService.recordTransaction({
    id: 'txn-009',
    type: TransactionType.INTEREST,
    status: TransactionStatus.COMPLETED,
    amount: 25.50,
    currency: 'USD',
    destinationAccountId: accountId,
    description: 'Monthly interest earned',
    createdAt: new Date('2025-01-31'),
    completedAt: new Date('2025-01-31')
  });

  // Get account statement
  const statement = ledgerService.getAccountStatement(
    accountId,
    new Date('2025-01-01'),
    new Date('2025-01-31')
  );

  console.log('=== Account Statement ===\n');
  statement.forEach(entry => {
    console.log(entry.format());
  });

  // Reconcile account
  const reconciliation = ledgerService.reconcileAccount(accountId);
  console.log('\n=== Reconciliation Report ===');
  console.log(`Account ID:        ${reconciliation.accountId}`);
  console.log(`Total Debits:      $${reconciliation.totalDebits.toFixed(2)}`);
  console.log(`Total Credits:     $${reconciliation.totalCredits.toFixed(2)}`);
  console.log(`Net Balance:       $${reconciliation.netBalance.toFixed(2)}`);
  console.log(`Expected Balance:  $${reconciliation.expectedBalance.toFixed(2)}`);
  console.log(`Is Balanced:       ${reconciliation.isBalanced ? 'Yes' : 'No'}`);
  console.log(`Entry Count:       ${reconciliation.entryCount}`);
  console.log(`Reconciled At:     ${reconciliation.reconciledAt.toISOString()}`);
}

// Example 4: Ledger Verification
function example4_LedgerVerification() {
  console.log('\n=== Example 4: Ledger Verification ===\n');

  const ledgerService = new LedgerService();

  // Record multiple transactions
  const transactions: Transaction[] = [
    {
      id: 'txn-010',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      amount: 2000.00,
      currency: 'USD',
      destinationAccountId: 'acc-001',
      description: 'Deposit',
      createdAt: new Date(),
      completedAt: new Date()
    },
    {
      id: 'txn-011',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      amount: 3000.00,
      currency: 'USD',
      destinationAccountId: 'acc-002',
      description: 'Deposit',
      createdAt: new Date(),
      completedAt: new Date()
    },
    {
      id: 'txn-012',
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      amount: 500.00,
      currency: 'USD',
      sourceAccountId: 'acc-001',
      destinationAccountId: 'acc-002',
      description: 'Transfer',
      createdAt: new Date(),
      completedAt: new Date()
    }
  ];

  transactions.forEach(txn => ledgerService.recordTransaction(txn));

  const ledger = ledgerService.getLedger();
  const summary = ledger.getSummary();

  console.log('=== Ledger Summary ===');
  console.log(`Total Entries:         ${summary.totalEntries}`);
  console.log(`Total Debits:          $${summary.totalDebits.toFixed(2)}`);
  console.log(`Total Credits:         $${summary.totalCredits.toFixed(2)}`);
  console.log(`Unique Accounts:       ${summary.uniqueAccounts}`);
  console.log(`Unique Transactions:   ${summary.uniqueTransactions}`);

  try {
    const isBalanced = ledger.verifyLedgerBalance();
    console.log(`\nLedger Verification:   ${isBalanced ? 'PASSED ✓' : 'FAILED ✗'}`);
  } catch (error) {
    console.error('Ledger verification failed:', error);
  }
}

// Example 5: Error Handling
function example5_ErrorHandling() {
  console.log('\n=== Example 5: Error Handling ===\n');

  const ledgerService = new LedgerService();

  // Attempt invalid transaction
  try {
    const invalidTransaction: Transaction = {
      id: 'txn-013',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING, // Invalid status
      amount: 100.00,
      currency: 'USD',
      destinationAccountId: 'acc-001',
      description: 'Invalid deposit',
      createdAt: new Date()
    };

    ledgerService.recordTransaction(invalidTransaction);
  } catch (error: any) {
    console.log('Expected error caught:');
    console.log(`  Error Type: ${error.name}`);
    console.log(`  Message: ${error.message}`);
    console.log(`  Code: ${error.code}`);
  }

  // Attempt invalid entry
  try {
    const invalidEntry = new LedgerEntry({
      transactionId: 'txn-014',
      accountId: 'acc-001',
      entryType: 'INVALID' as any, // Invalid entry type
      amount: 100.00,
      currency: 'USD',
      description: 'Invalid entry'
    });
  } catch (error: any) {
    console.log('\nExpected error caught:');
    console.log(`  Error Type: ${error.name}`);
    console.log(`  Message: ${error.message}`);
  }

  // Attempt unbalanced double entry
  try {
    const ledger = new Ledger();
    const debitEntry = new LedgerEntry({
      transactionId: 'txn-015',
      accountId: 'acc-001',
      entryType: EntryType.DEBIT,
      amount: 100.00,
      currency: 'USD',
      description: 'Debit entry'
    });

    const creditEntry = new LedgerEntry({
      transactionId: 'txn-015',
      accountId: 'acc-002',
      entryType: EntryType.CREDIT,
      amount: 99.00, // Different amount
      currency: 'USD',
      description: 'Credit entry'
    });

    ledger.validateDoubleEntry(debitEntry, creditEntry);
  } catch (error: any) {
    console.log('\nExpected error caught:');
    console.log(`  Error Type: ${error.name}`);
    console.log(`  Message: ${error.message}`);
  }
}

// Run all examples
function runAllExamples() {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║  Double-Entry Bookkeeping Ledger System Demo  ║');
  console.log('╚════════════════════════════════════════════════╝');

  example1_SimpleDeposit();
  example2_Transfer();
  example3_MultipleTransactions();
  example4_LedgerVerification();
  example5_ErrorHandling();

  console.log('\n=== All Examples Completed ===\n');
}

// Export for use
export {
  example1_SimpleDeposit,
  example2_Transfer,
  example3_MultipleTransactions,
  example4_LedgerVerification,
  example5_ErrorHandling,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
