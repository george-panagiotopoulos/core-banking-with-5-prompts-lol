# Product Configuration System

This module implements a comprehensive product configuration system for the core banking platform. It provides flexible support for different account types (Basic, Premium, Business) with customizable fee structures, interest rates, overdraft protection, and transaction limits.

## Architecture

The product configuration system follows Domain-Driven Design principles:

- **Product** - Entity representing a banking product with configuration and business logic
- **ProductService** - Service layer managing product lifecycle and CRUD operations
- **ProductRules** - Business rules and validations for product operations
- **FeeCalculator** - Specialized service for fee calculations

## Core Components

### 1. Product Entity (`product.ts`)

Represents a banking product with all its configuration properties and business logic.

**Key Methods:**
- `isActive()` - Check if product is currently active
- `getEffectiveFees(balance)` - Get fees after applying waive conditions
- `getInterestRate(balance)` - Get applicable interest rate for a balance (supports tiered rates)
- `getFeeByType(feeType)` - Retrieve specific fee configuration
- `hasOverdraftProtection()` - Check if overdraft is allowed
- `hasInterest()` - Check if product supports interest

### 2. ProductService (`product-service.ts`)

Manages product lifecycle and provides CRUD operations.

**Key Methods:**
- `createProduct(config)` - Create a new product
- `getProduct(productId)` - Retrieve product by ID
- `updateProduct(productId, updates)` - Update product configuration
- `listProducts(filters)` - List products with optional filtering
- `activateProduct(productId)` - Activate a product
- `deactivateProduct(productId)` - Deactivate a product
- `deleteProduct(productId)` - Delete a product (only inactive/deprecated)

### 3. ProductRules (`product-rules.ts`)

Business rules and validations for product operations.

**Key Methods:**
- `validateMinimumBalance(product, balance)` - Validate minimum balance requirement
- `calculateOverdraftAvailable(product, balance)` - Calculate available overdraft
- `calculateInterest(product, balance, days)` - Calculate interest for a period
- `calculateFees(product, transactionType)` - Calculate fees for transaction type
- `validateTransactionAllowed(product, transaction)` - Validate if transaction is allowed
- `validateWithdrawal(product, balance, amount)` - Validate withdrawal request
- `validateDailyWithdrawalLimit(product, dailyTotal, newWithdrawal)` - Check daily limits
- `validateMonthlyTransactionCount(product, currentCount)` - Check monthly transaction limits
- `validateMinimumOpeningDeposit(product, deposit)` - Validate opening deposit

### 4. FeeCalculator (`fee-calculator.ts`)

Specialized service for calculating various fees.

**Key Methods:**
- `calculateMonthlyFee(product, balance)` - Calculate monthly maintenance fee
- `calculateTransactionFee(product, transaction)` - Calculate transaction fee
- `calculateOverdraftFee(product, overdraftAmount)` - Calculate overdraft fee
- `calculateInterestCharge(product, balance, days)` - Calculate overdraft interest
- `calculateATMFee(product, isOwnNetwork)` - Calculate ATM withdrawal fee
- `calculateWireTransferFee(product, isInternational)` - Calculate wire transfer fee
- `calculateInsufficientFundsFee(product)` - Calculate NSF fee
- `calculateTotalFeesForPeriod(product, transactions, balance, days)` - Calculate total fees
- `estimateMonthlyFees(product, balance, usage)` - Estimate monthly fees

## Product Types

### Account Types
- **BASIC** - Basic checking account with minimal features
- **PREMIUM** - Premium account with enhanced benefits
- **BUSINESS** - Business checking account for commercial customers

### Fee Types
- **MONTHLY_MAINTENANCE** - Monthly account maintenance fee
- **TRANSACTION** - Per-transaction fee
- **OVERDRAFT** - Overdraft usage fee
- **ATM_WITHDRAWAL** - ATM withdrawal fee
- **WIRE_TRANSFER** - Domestic wire transfer fee
- **INTERNATIONAL_TRANSFER** - International wire transfer fee
- **INSUFFICIENT_FUNDS** - Insufficient funds/NSF fee

### Interest Calculation Methods
- **SIMPLE** - Simple interest calculation
- **COMPOUND_DAILY** - Daily compounding
- **COMPOUND_MONTHLY** - Monthly compounding

## Usage Examples

### Creating a Basic Account Product

```typescript
import { ProductService, Currency } from './products';
import { createMoney } from './products/money-utils';

const productService = new ProductService();

const basicProduct = await productService.createProduct({
  id: 'basic-checking-001',
  name: 'Basic Checking Account',
  description: 'No-frills checking account with low fees',
  accountType: AccountType.BASIC,
  status: ProductStatus.ACTIVE,
  fees: [
    {
      type: FeeType.MONTHLY_MAINTENANCE,
      amount: createMoney(500, Currency.USD), // $5.00 in cents
      waiveConditions: {
        minimumBalance: createMoney(100000, Currency.USD) // Waive if balance >= $1000
      }
    },
    {
      type: FeeType.TRANSACTION,
      amount: createMoney(100, Currency.USD) // $1.00 per transaction
    }
  ],
  minimumBalance: createMoney(10000, Currency.USD), // $100 minimum
  minimumOpeningDeposit: createMoney(2500, Currency.USD), // $25 to open
  transactionLimits: {
    dailyWithdrawalLimit: createMoney(50000, Currency.USD), // $500/day
    perTransactionLimit: createMoney(100000, Currency.USD), // $1000/transaction
    monthlyTransactionCount: 20
  },
  features: ['Online Banking', 'Mobile App', 'Debit Card'],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Creating a Premium Account with Interest

```typescript
const premiumProduct = await productService.createProduct({
  id: 'premium-checking-001',
  name: 'Premium Checking Account',
  description: 'Feature-rich account with interest and benefits',
  accountType: AccountType.PREMIUM,
  status: ProductStatus.ACTIVE,
  fees: [
    {
      type: FeeType.MONTHLY_MAINTENANCE,
      amount: createMoney(1500, Currency.USD), // $15.00/month
      waiveConditions: {
        minimumBalance: createMoney(500000, Currency.USD) // Waive if balance >= $5000
      }
    }
  ],
  interestConfig: {
    annualRate: 2.5, // 2.5% APY
    calculationMethod: InterestCalculationMethod.COMPOUND_DAILY,
    minimumBalance: createMoney(100000, Currency.USD), // Need $1000 minimum to earn interest
    tieredRates: [
      { threshold: createMoney(0, Currency.USD), rate: 2.5 },
      { threshold: createMoney(1000000, Currency.USD), rate: 3.0 }, // 3% for balances $10k+
      { threshold: createMoney(5000000, Currency.USD), rate: 3.5 }  // 3.5% for balances $50k+
    ]
  },
  overdraftConfig: {
    allowed: true,
    limit: createMoney(100000, Currency.USD), // $1000 overdraft limit
    fee: createMoney(3500, Currency.USD), // $35 overdraft fee
    interestRate: 18.0 // 18% APR on overdraft
  },
  minimumBalance: createMoney(100000, Currency.USD),
  minimumOpeningDeposit: createMoney(10000, Currency.USD),
  transactionLimits: {
    dailyWithdrawalLimit: createMoney(200000, Currency.USD), // $2000/day
    perTransactionLimit: createMoney(500000, Currency.USD) // $5000/transaction
  },
  features: [
    'Online Banking',
    'Mobile App',
    'Premium Debit Card',
    'Free Wire Transfers',
    'Overdraft Protection',
    'Interest Earnings',
    '24/7 Customer Support'
  ],
  createdAt: new Date(),
  updatedAt: new Date()
});
```

### Using ProductRules

```typescript
import { ProductRules } from './products';

const rules = new ProductRules();

// Validate minimum balance
const hasMinBalance = rules.validateMinimumBalance(
  product,
  createMoney(150000, Currency.USD) // $1500
);

// Calculate available overdraft
const availableOverdraft = rules.calculateOverdraftAvailable(
  product,
  createMoney(-50000, Currency.USD) // -$500 current balance
);

// Calculate interest for 30 days
const interest = rules.calculateInterest(
  product,
  createMoney(1000000, Currency.USD), // $10000 balance
  30 // days
);

// Validate withdrawal
try {
  rules.validateWithdrawal(
    product,
    createMoney(200000, Currency.USD), // $2000 current balance
    createMoney(150000, Currency.USD)  // $1500 withdrawal
  );
} catch (error) {
  console.error('Withdrawal validation failed:', error.message);
}
```

### Using FeeCalculator

```typescript
import { FeeCalculator } from './products';

const calculator = new FeeCalculator();

// Calculate monthly fee
const monthlyFee = calculator.calculateMonthlyFee(
  product,
  createMoney(75000, Currency.USD) // $750 balance
);

// Calculate transaction fee
const transactionFee = calculator.calculateTransactionFee(product, transaction);

// Estimate monthly fees
const estimatedFees = calculator.estimateMonthlyFees(
  product,
  createMoney(500000, Currency.USD), // $5000 average balance
  15, // 15 transactions
  4,  // 4 ATM withdrawals
  1   // 1 wire transfer
);
```

## Money Utilities

The system uses Money as a value object. Helper functions are provided:

```typescript
import { createMoney, addMoney, formatMoney } from './products/money-utils';

// Create Money (amount in base units - cents for USD)
const amount = createMoney(1000, Currency.USD); // $10.00

// Add Money values
const total = addMoney(amount, createMoney(500, Currency.USD)); // $15.00

// Format for display
console.log(formatMoney(total)); // "USD 15.00"

// Create from decimal
import { moneyFromDecimal } from './products/money-utils';
const amount2 = moneyFromDecimal(99.99, Currency.USD); // $99.99
```

## Integration Points

The product configuration system integrates with:

1. **Account Module** - Products define account behavior
2. **Transaction Module** - Product rules validate transactions
3. **Ledger Module** - Fee calculations impact ledger entries
4. **Customer Module** - Products available to different customer segments

## Testing

The system includes comprehensive validation:

- Product configuration validation
- Business rule validation
- Fee calculation accuracy
- Interest calculation verification
- Transaction limit enforcement

## Error Handling

Custom error types for different scenarios:

- `ValidationError` - Configuration validation failures
- `BusinessRuleError` - Business rule violations
- `InsufficientFundsError` - Insufficient funds for operations

## Future Enhancements

Potential areas for expansion:

1. Promotional pricing and fee waivers
2. Product bundles and packages
3. Time-based fee schedules
4. Regional product variations
5. Automated product migrations
6. A/B testing for product features
7. Product recommendation engine
8. Compliance rule integration
