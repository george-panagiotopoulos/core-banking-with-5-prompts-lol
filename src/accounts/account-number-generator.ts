/**
 * Account Number Generator
 * Generates unique account numbers with validation
 * Format: 2-digit branch code + 8-digit sequence + 2-digit checksum
 */

import { ValidationError } from '../core/errors';

export interface AccountNumberConfig {
  branchCode?: string;
  sequenceLength?: number;
  checksumLength?: number;
}

export class AccountNumberGenerator {
  private readonly branchCodeLength = 2;
  private readonly sequenceLength = 8;
  private readonly checksumLength = 2;
  private readonly totalLength = 12; // 2 + 8 + 2

  private defaultBranchCode: string;
  private sequenceCounter: number = 0;
  private usedNumbers: Set<string> = new Set();

  constructor(config?: AccountNumberConfig) {
    this.defaultBranchCode = config?.branchCode || '01';

    if (this.defaultBranchCode.length !== this.branchCodeLength) {
      throw new ValidationError(
        `Branch code must be ${this.branchCodeLength} digits`,
        [this.defaultBranchCode]
      );
    }

    if (!/^\d+$/.test(this.defaultBranchCode)) {
      throw new ValidationError('Branch code must contain only digits', [this.defaultBranchCode]);
    }
  }

  /**
   * Generates a unique account number
   * Format: BB-SSSSSSSS-CC
   * BB = Branch code (2 digits)
   * SSSSSSSS = Sequence number (8 digits)
   * CC = Checksum (2 digits, Luhn algorithm)
   */
  generate(branchCode?: string): string {
    const branch = branchCode || this.defaultBranchCode;

    if (branch.length !== this.branchCodeLength || !/^\d+$/.test(branch)) {
      throw new ValidationError(
        `Branch code must be ${this.branchCodeLength} digits`,
        [branch]
      );
    }

    let accountNumber: string;
    let attempts = 0;
    const maxAttempts = 1000;

    // Generate unique account number
    do {
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique account number after maximum attempts');
      }

      const sequence = this.generateSequence();
      const baseNumber = branch + sequence;
      const checksum = this.calculateChecksum(baseNumber);
      accountNumber = baseNumber + checksum;

      attempts++;
    } while (this.usedNumbers.has(accountNumber));

    this.usedNumbers.add(accountNumber);
    return accountNumber;
  }

  /**
   * Validates an account number format and checksum
   */
  validate(accountNumber: string): boolean {
    // Remove any formatting (dashes, spaces)
    const cleaned = accountNumber.replace(/[-\s]/g, '');

    // Check length
    if (cleaned.length !== this.totalLength) {
      return false;
    }

    // Check if all digits
    if (!/^\d+$/.test(cleaned)) {
      return false;
    }

    // Extract parts
    const baseNumber = cleaned.substring(0, this.totalLength - this.checksumLength);
    const providedChecksum = cleaned.substring(this.totalLength - this.checksumLength);

    // Validate checksum
    const calculatedChecksum = this.calculateChecksum(baseNumber);

    return providedChecksum === calculatedChecksum;
  }

  /**
   * Formats an account number for display
   * Example: 01-12345678-42
   */
  format(accountNumber: string): string {
    const cleaned = accountNumber.replace(/[-\s]/g, '');

    if (cleaned.length !== this.totalLength) {
      throw new ValidationError('Invalid account number length for formatting', [accountNumber]);
    }

    const branch = cleaned.substring(0, this.branchCodeLength);
    const sequence = cleaned.substring(
      this.branchCodeLength,
      this.branchCodeLength + this.sequenceLength
    );
    const checksum = cleaned.substring(
      this.branchCodeLength + this.sequenceLength
    );

    return `${branch}-${sequence}-${checksum}`;
  }

  /**
   * Extracts branch code from account number
   */
  extractBranchCode(accountNumber: string): string {
    const cleaned = accountNumber.replace(/[-\s]/g, '');

    if (cleaned.length !== this.totalLength) {
      throw new ValidationError('Invalid account number length', [accountNumber]);
    }

    return cleaned.substring(0, this.branchCodeLength);
  }

  /**
   * Resets the generator state (mainly for testing)
   */
  reset(): void {
    this.sequenceCounter = 0;
    this.usedNumbers.clear();
  }

  /**
   * Gets the count of generated account numbers
   */
  getGeneratedCount(): number {
    return this.usedNumbers.size;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generates a sequential 8-digit number
   */
  private generateSequence(): string {
    this.sequenceCounter++;

    // Add some randomness to avoid predictable sequences
    const timestamp = Date.now() % 10000; // Last 4 digits of timestamp
    const sequence = (this.sequenceCounter * 10000 + timestamp) % 100000000;

    return sequence.toString().padStart(this.sequenceLength, '0');
  }

  /**
   * Calculates checksum using Luhn algorithm (mod 10)
   * Returns 2-digit checksum
   */
  private calculateChecksum(baseNumber: string): string {
    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    // Process digits from right to left
    for (let i = baseNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(baseNumber[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    // Calculate check digit
    const checkDigit = (10 - (sum % 10)) % 10;

    // For 2-digit checksum, add a secondary check based on sum of all digits
    const digitSum = baseNumber.split('').reduce((acc, d) => acc + parseInt(d, 10), 0);
    const secondCheckDigit = digitSum % 10;

    return `${checkDigit}${secondCheckDigit}`;
  }

}
