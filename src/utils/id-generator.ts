import { v4 as uuidv4 } from 'uuid';

/**
 * Generates unique identifiers for various banking entities
 */
export class IdGenerator {
  /**
   * Generate a UUID for entities
   */
  static uuid(): string {
    return uuidv4();
  }

  /**
   * Generate a transaction ID with prefix
   */
  static transactionId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate a ledger entry ID with prefix
   */
  static ledgerEntryId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `LED-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate an account ID with prefix
   */
  static accountId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ACC-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate a product ID with prefix
   */
  static productId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PRD-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate a reference number for transactions
   */
  static reference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `REF-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate an idempotency key
   */
  static idempotencyKey(): string {
    return uuidv4();
  }
}
