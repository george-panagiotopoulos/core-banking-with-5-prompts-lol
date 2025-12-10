/**
 * Transaction Processor for executing banking transactions
 */

import { v4 as uuidv4 } from 'uuid';
import { Money, TransactionType, TransactionStatus, ValidationResult, Account, Currency } from '../core/domain';
import {
  TransactionNotFoundError,
  TransactionAlreadyProcessedError,
  TransactionNotReversibleError,
  ValidationError,
  AccountNotFoundError
} from '../core/errors';
import { Transaction } from './transaction';
import { TransactionValidator, AccountRepository } from './transaction-validator';
import { createMoney } from '../core/money-utils';

export interface TransactionRepository {
  save(transaction: Transaction): Promise<Transaction>;
  findById(id: string): Promise<Transaction | null>;
  findByIdempotencyKey(key: string): Promise<Transaction | null>;
  update(transaction: Transaction): Promise<Transaction>;
}

export interface LedgerService {
  recordDebit(accountId: string, amount: Money, transactionId: string): Promise<void>;
  recordCredit(accountId: string, amount: Money, transactionId: string): Promise<void>;
  rollback(transactionId: string): Promise<void>;
}

export interface TransactionProcessorOptions {
  enableIdempotency?: boolean;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class TransactionProcessor {
  private readonly options: Required<TransactionProcessorOptions>;

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly ledgerService: LedgerService,
    private readonly validator: TransactionValidator,
    options: TransactionProcessorOptions = {}
  ) {
    this.options = {
      enableIdempotency: options.enableIdempotency ?? true,
      maxRetries: options.maxRetries ?? 3,
      retryDelayMs: options.retryDelayMs ?? 100
    };
  }

  /**
   * Process a transfer transaction between two accounts
   */
  async processTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: Money,
    reference?: string | undefined,
    idempotencyKey?: string | undefined
  ): Promise<Transaction> {
    // Check for duplicate transaction if idempotency is enabled
    if (this.options.enableIdempotency && idempotencyKey) {
      const existing = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.isFinal()) {
          return existing;
        }
        throw new TransactionAlreadyProcessedError(existing.id);
      }
    }

    // Validate the transfer
    const validationResult = await this.validator.validateTransfer(fromAccountId, toAccountId, amount);
    if (!validationResult.isValid) {
      throw new ValidationError('Transfer validation failed', validationResult.errors);
    }

    // Create transaction
    const transaction = new Transaction({
      id: uuidv4(),
      type: TransactionType.TRANSFER,
      amount,
      sourceAccountId: fromAccountId,
      destinationAccountId: toAccountId,
      reference: reference ?? `TRANSFER-${Date.now()}`,
      idempotencyKey: idempotencyKey ?? undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'TRANSFER'
      }
    });

    // Save transaction in PENDING state
    await this.transactionRepository.save(transaction);

    try {
      // Mark as processing
      transaction.markAsProcessing();
      await this.transactionRepository.update(transaction);

      // Execute the transfer in ledger
      await this.ledgerService.recordDebit(fromAccountId, amount, transaction.id);
      await this.ledgerService.recordCredit(toAccountId, amount, transaction.id);

      // Mark as completed
      transaction.markAsCompleted();
      await this.transactionRepository.update(transaction);

      return transaction;
    } catch (error: any) {
      // Rollback if possible
      try {
        await this.ledgerService.rollback(transaction.id);
      } catch (rollbackError) {
        // Log rollback error but throw original error
        console.error('Failed to rollback transaction:', rollbackError);
      }

      // Mark as failed
      transaction.markAsFailed(error.message);
      await this.transactionRepository.update(transaction);

      throw error;
    }
  }

  /**
   * Process a deposit transaction
   */
  async processDeposit(
    accountId: string,
    amount: Money,
    reference?: string | undefined,
    idempotencyKey?: string | undefined
  ): Promise<Transaction> {
    // Check for duplicate transaction
    if (this.options.enableIdempotency && idempotencyKey) {
      const existing = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.isFinal()) {
          return existing;
        }
        throw new TransactionAlreadyProcessedError(existing.id);
      }
    }

    // Validate the deposit
    const validationResult = await this.validator.validateDeposit(accountId, amount);
    if (!validationResult.isValid) {
      throw new ValidationError('Deposit validation failed', validationResult.errors);
    }

    // Create transaction
    const transaction = new Transaction({
      id: uuidv4(),
      type: TransactionType.DEPOSIT,
      amount,
      destinationAccountId: accountId,
      reference: reference ?? `DEPOSIT-${Date.now()}`,
      idempotencyKey: idempotencyKey ?? undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'DEPOSIT'
      }
    });

    // Save transaction in PENDING state
    await this.transactionRepository.save(transaction);

    try {
      // Mark as processing
      transaction.markAsProcessing();
      await this.transactionRepository.update(transaction);

      // Execute the deposit in ledger
      await this.ledgerService.recordCredit(accountId, amount, transaction.id);

      // Mark as completed
      transaction.markAsCompleted();
      await this.transactionRepository.update(transaction);

      return transaction;
    } catch (error: any) {
      // Rollback if possible
      try {
        await this.ledgerService.rollback(transaction.id);
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }

      // Mark as failed
      transaction.markAsFailed(error.message);
      await this.transactionRepository.update(transaction);

      throw error;
    }
  }

  /**
   * Process a withdrawal transaction
   */
  async processWithdrawal(
    accountId: string,
    amount: Money,
    reference?: string | undefined,
    idempotencyKey?: string | undefined
  ): Promise<Transaction> {
    // Check for duplicate transaction
    if (this.options.enableIdempotency && idempotencyKey) {
      const existing = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.isFinal()) {
          return existing;
        }
        throw new TransactionAlreadyProcessedError(existing.id);
      }
    }

    // Validate the withdrawal
    const validationResult = await this.validator.validateWithdrawal(accountId, amount);
    if (!validationResult.isValid) {
      throw new ValidationError('Withdrawal validation failed', validationResult.errors);
    }

    // Create transaction
    const transaction = new Transaction({
      id: uuidv4(),
      type: TransactionType.WITHDRAWAL,
      amount,
      sourceAccountId: accountId,
      reference: reference ?? `WITHDRAWAL-${Date.now()}`,
      idempotencyKey: idempotencyKey ?? undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'WITHDRAWAL'
      }
    });

    // Save transaction in PENDING state
    await this.transactionRepository.save(transaction);

    try {
      // Mark as processing
      transaction.markAsProcessing();
      await this.transactionRepository.update(transaction);

      // Execute the withdrawal in ledger
      await this.ledgerService.recordDebit(accountId, amount, transaction.id);

      // Mark as completed
      transaction.markAsCompleted();
      await this.transactionRepository.update(transaction);

      return transaction;
    } catch (error: any) {
      // Rollback if possible
      try {
        await this.ledgerService.rollback(transaction.id);
      } catch (rollbackError) {
        console.error('Failed to rollback transaction:', rollbackError);
      }

      // Mark as failed
      transaction.markAsFailed(error.message);
      await this.transactionRepository.update(transaction);

      throw error;
    }
  }

  /**
   * Reverse a completed transaction
   */
  async reverseTransaction(
    transactionId: string,
    reason: string,
    idempotencyKey?: string | undefined
  ): Promise<Transaction> {
    // Check for duplicate reversal
    if (this.options.enableIdempotency && idempotencyKey) {
      const existing = await this.transactionRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.isFinal()) {
          return existing;
        }
        throw new TransactionAlreadyProcessedError(existing.id);
      }
    }

    // Get original transaction
    const originalTransaction = await this.transactionRepository.findById(transactionId);
    if (!originalTransaction) {
      throw new TransactionNotFoundError(transactionId);
    }

    // Check if transaction can be reversed
    if (!originalTransaction.isReversible()) {
      const blockReason = originalTransaction.getReversalBlockReason();
      throw new TransactionNotReversibleError(transactionId, blockReason || 'Unknown reason');
    }

    // Create reversal transaction
    const reversalTransaction = new Transaction({
      id: uuidv4(),
      type: TransactionType.REVERSAL,
      amount: originalTransaction.amount,
      sourceAccountId: originalTransaction.destinationAccountId ?? undefined,
      destinationAccountId: originalTransaction.sourceAccountId ?? undefined,
      reference: `REVERSAL-${originalTransaction.reference}`,
      idempotencyKey: idempotencyKey ?? undefined,
      originalTransactionId: transactionId,
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'REVERSAL',
        reason,
        originalTransactionId: transactionId
      }
    });

    // Save reversal transaction
    await this.transactionRepository.save(reversalTransaction);

    try {
      // Mark as processing
      reversalTransaction.markAsProcessing();
      await this.transactionRepository.update(reversalTransaction);

      // Execute the reversal based on original transaction type
      if (originalTransaction.type === TransactionType.TRANSFER) {
        // Reverse the transfer
        await this.ledgerService.recordDebit(
          originalTransaction.destinationAccountId!,
          originalTransaction.amount,
          reversalTransaction.id
        );
        await this.ledgerService.recordCredit(
          originalTransaction.sourceAccountId!,
          originalTransaction.amount,
          reversalTransaction.id
        );
      } else if (originalTransaction.type === TransactionType.DEPOSIT) {
        // Reverse the deposit
        await this.ledgerService.recordDebit(
          originalTransaction.destinationAccountId!,
          originalTransaction.amount,
          reversalTransaction.id
        );
      } else if (originalTransaction.type === TransactionType.WITHDRAWAL) {
        // Reverse the withdrawal
        await this.ledgerService.recordCredit(
          originalTransaction.sourceAccountId!,
          originalTransaction.amount,
          reversalTransaction.id
        );
      }

      // Mark reversal as completed
      reversalTransaction.markAsCompleted();
      await this.transactionRepository.update(reversalTransaction);

      // Mark original transaction as reversed
      originalTransaction.markAsReversed(reversalTransaction.id);
      await this.transactionRepository.update(originalTransaction);

      return reversalTransaction;
    } catch (error: any) {
      // Rollback if possible
      try {
        await this.ledgerService.rollback(reversalTransaction.id);
      } catch (rollbackError) {
        console.error('Failed to rollback reversal transaction:', rollbackError);
      }

      // Mark reversal as failed
      reversalTransaction.markAsFailed(error.message);
      await this.transactionRepository.update(reversalTransaction);

      throw error;
    }
  }

  /**
   * Validate a transaction without executing it
   */
  async validateTransaction(transaction: Transaction): Promise<ValidationResult> {
    try {
      // Validate amount
      const amountValidation = transaction.validateAmount();
      if (!amountValidation.isValid) {
        return amountValidation;
      }

      // Validate based on transaction type
      switch (transaction.type) {
        case TransactionType.TRANSFER:
          if (!transaction.sourceAccountId || !transaction.destinationAccountId) {
            return {
              isValid: false,
              errors: ['Transfer requires both source and destination accounts']
            };
          }
          return await this.validator.validateTransfer(
            transaction.sourceAccountId,
            transaction.destinationAccountId,
            transaction.amount
          );

        case TransactionType.DEPOSIT:
          if (!transaction.destinationAccountId) {
            return {
              isValid: false,
              errors: ['Deposit requires a destination account']
            };
          }
          return await this.validator.validateDeposit(
            transaction.destinationAccountId,
            transaction.amount
          );

        case TransactionType.WITHDRAWAL:
          if (!transaction.sourceAccountId) {
            return {
              isValid: false,
              errors: ['Withdrawal requires a source account']
            };
          }
          return await this.validator.validateWithdrawal(
            transaction.sourceAccountId,
            transaction.amount
          );

        default:
          return {
            isValid: false,
            errors: [`Unsupported transaction type: ${transaction.type}`]
          };
      }
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }
}
