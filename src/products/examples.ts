/**
 * Product Configuration Examples
 * Demonstrates how to create and use different product types
 */

import { Currency } from '../core/domain';
import { ProductService } from './product-service';
import { ProductRules } from './product-rules';
import { FeeCalculator } from './fee-calculator';
import {
  AccountType,
  ProductStatus,
  FeeType,
  InterestCalculationMethod
} from './types';
import { createMoney, formatMoney } from './money-utils';

/**
 * Example 1: Create a Basic Checking Account
 */
export async function createBasicCheckingProduct(): Promise<void> {
  const service = new ProductService();

  const basicProduct = await service.createProduct({
    id: 'basic-checking-001',
    name: 'Basic Checking Account',
    description: 'Simple checking account with low fees and no minimum balance requirement',
    accountType: AccountType.BASIC,
    status: ProductStatus.ACTIVE,
    fees: [
      {
        type: FeeType.MONTHLY_MAINTENANCE,
        amount: createMoney(500, Currency.USD), // $5.00/month
        waiveConditions: {
          minimumBalance: createMoney(100000, Currency.USD) // Waive if balance >= $1000
        }
      },
      {
        type: FeeType.TRANSACTION,
        amount: createMoney(50, Currency.USD) // $0.50 per transaction
      },
      {
        type: FeeType.ATM_WITHDRAWAL,
        amount: createMoney(300, Currency.USD) // $3.00 at non-network ATMs
      }
    ],
    minimumBalance: createMoney(0, Currency.USD), // No minimum
    minimumOpeningDeposit: createMoney(2500, Currency.USD), // $25 to open
    transactionLimits: {
      dailyWithdrawalLimit: createMoney(50000, Currency.USD), // $500/day
      perTransactionLimit: createMoney(100000, Currency.USD), // $1000/transaction
      monthlyTransactionCount: 30
    },
    features: [
      'Online Banking',
      'Mobile App',
      'Debit Card',
      'Bill Pay'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Basic Checking Product:', basicProduct.name);
}

/**
 * Example 2: Create a Premium Checking Account with Interest
 */
export async function createPremiumCheckingProduct(): Promise<void> {
  const service = new ProductService();

  const premiumProduct = await service.createProduct({
    id: 'premium-checking-001',
    name: 'Premium Checking Account',
    description: 'Feature-rich account with interest earnings and premium benefits',
    accountType: AccountType.PREMIUM,
    status: ProductStatus.ACTIVE,
    fees: [
      {
        type: FeeType.MONTHLY_MAINTENANCE,
        amount: createMoney(1500, Currency.USD), // $15.00/month
        waiveConditions: {
          minimumBalance: createMoney(500000, Currency.USD), // Waive if balance >= $5000
          monthlyTransactionCount: 10 // Or 10+ transactions
        }
      }
    ],
    interestConfig: {
      annualRate: 2.5, // 2.5% APY
      calculationMethod: InterestCalculationMethod.COMPOUND_DAILY,
      minimumBalance: createMoney(100000, Currency.USD), // Need $1000 to earn interest
      tieredRates: [
        { threshold: createMoney(0, Currency.USD), rate: 2.5 },
        { threshold: createMoney(1000000, Currency.USD), rate: 3.0 }, // 3% for $10k+
        { threshold: createMoney(5000000, Currency.USD), rate: 3.5 }  // 3.5% for $50k+
      ]
    },
    overdraftConfig: {
      allowed: true,
      limit: createMoney(100000, Currency.USD), // $1000 overdraft
      fee: createMoney(3500, Currency.USD), // $35 fee
      interestRate: 18.0 // 18% APR
    },
    minimumBalance: createMoney(100000, Currency.USD), // $1000 minimum
    minimumOpeningDeposit: createMoney(10000, Currency.USD), // $100 to open
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
      '24/7 Priority Support',
      'Cashback Rewards',
      'Identity Theft Protection'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Premium Checking Product:', premiumProduct.name);
}

/**
 * Example 3: Create a Business Checking Account
 */
export async function createBusinessCheckingProduct(): Promise<void> {
  const service = new ProductService();

  const businessProduct = await service.createProduct({
    id: 'business-checking-001',
    name: 'Business Checking Account',
    description: 'Comprehensive business account with high transaction limits',
    accountType: AccountType.BUSINESS,
    status: ProductStatus.ACTIVE,
    fees: [
      {
        type: FeeType.MONTHLY_MAINTENANCE,
        amount: createMoney(2000, Currency.USD), // $20.00/month
        waiveConditions: {
          minimumBalance: createMoney(1000000, Currency.USD) // Waive if balance >= $10k
        }
      },
      {
        type: FeeType.TRANSACTION,
        amount: createMoney(25, Currency.USD), // $0.25 per transaction after 100 free
      },
      {
        type: FeeType.WIRE_TRANSFER,
        amount: createMoney(2500, Currency.USD) // $25 per wire
      },
      {
        type: FeeType.INTERNATIONAL_TRANSFER,
        amount: createMoney(5000, Currency.USD) // $50 international wire
      }
    ],
    interestConfig: {
      annualRate: 1.5, // 1.5% APY
      calculationMethod: InterestCalculationMethod.COMPOUND_MONTHLY,
      minimumBalance: createMoney(500000, Currency.USD) // $5000 minimum for interest
    },
    overdraftConfig: {
      allowed: true,
      limit: createMoney(500000, Currency.USD), // $5000 overdraft
      fee: createMoney(5000, Currency.USD), // $50 fee
      interestRate: 15.0 // 15% APR
    },
    minimumBalance: createMoney(500000, Currency.USD), // $5000 minimum
    minimumOpeningDeposit: createMoney(100000, Currency.USD), // $1000 to open
    transactionLimits: {
      dailyWithdrawalLimit: createMoney(1000000, Currency.USD), // $10k/day
      perTransactionLimit: createMoney(2500000, Currency.USD) // $25k/transaction
    },
    features: [
      'Online Banking',
      'Mobile App',
      'Business Debit Card',
      'ACH Transfers',
      'Wire Transfers',
      'Check Deposits',
      'Cash Management',
      'Multi-User Access',
      'Accounting Integration',
      'Merchant Services',
      'Dedicated Business Support'
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Created Business Checking Product:', businessProduct.name);
}

/**
 * Example 4: Calculate Fees for Different Scenarios
 */
export async function demonstrateFeeCalculations(): Promise<void> {
  const service = new ProductService();
  const calculator = new FeeCalculator();

  // Create a product for demonstration
  const product = await service.createProduct({
    id: 'demo-product',
    name: 'Demo Account',
    description: 'For demonstration',
    accountType: AccountType.PREMIUM,
    status: ProductStatus.ACTIVE,
    fees: [
      {
        type: FeeType.MONTHLY_MAINTENANCE,
        amount: createMoney(1000, Currency.USD),
        waiveConditions: {
          minimumBalance: createMoney(250000, Currency.USD)
        }
      },
      {
        type: FeeType.TRANSACTION,
        amount: createMoney(200, Currency.USD),
        percentage: 0.5 // 0.5% of transaction amount
      }
    ],
    overdraftConfig: {
      allowed: true,
      limit: createMoney(100000, Currency.USD),
      fee: createMoney(3500, Currency.USD),
      interestRate: 18.0
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // Scenario 1: Monthly fee with low balance (not waived)
  const lowBalance = createMoney(100000, Currency.USD); // $1000
  const monthlyFee1 = calculator.calculateMonthlyFee(product, lowBalance);
  console.log(`\nScenario 1 - Low Balance ($${lowBalance.amount / 100}):`);
  console.log(`Monthly Fee: ${formatMoney(monthlyFee1)}`);

  // Scenario 2: Monthly fee with high balance (waived)
  const highBalance = createMoney(300000, Currency.USD); // $3000
  const monthlyFee2 = calculator.calculateMonthlyFee(product, highBalance);
  console.log(`\nScenario 2 - High Balance ($${highBalance.amount / 100}):`);
  console.log(`Monthly Fee: ${formatMoney(monthlyFee2)}`);

  // Scenario 3: Estimate monthly fees
  const avgBalance = createMoney(500000, Currency.USD); // $5000
  const estimatedFees = calculator.estimateMonthlyFees(
    product,
    avgBalance,
    20, // 20 transactions
    5,  // 5 ATM withdrawals
    2   // 2 wire transfers
  );
  console.log(`\nScenario 3 - Estimated Monthly Fees:`);
  console.log(`Average Balance: ${formatMoney(avgBalance)}`);
  console.log(`Estimated Fees: ${formatMoney(estimatedFees)}`);

  // Scenario 4: Overdraft fee
  const overdraftAmount = createMoney(50000, Currency.USD); // $500
  const overdraftFee = calculator.calculateOverdraftFee(product, overdraftAmount);
  console.log(`\nScenario 4 - Overdraft Fee:`);
  console.log(`Overdraft Amount: ${formatMoney(overdraftAmount)}`);
  console.log(`Overdraft Fee: ${formatMoney(overdraftFee)}`);

  // Scenario 5: Interest charge on negative balance
  const negativeBalance = createMoney(-50000, Currency.USD); // -$500
  const interestCharge = calculator.calculateInterestCharge(product, negativeBalance, 30);
  console.log(`\nScenario 5 - Interest Charge on Overdraft:`);
  console.log(`Negative Balance: ${formatMoney(negativeBalance)}`);
  console.log(`Interest Charge (30 days): ${formatMoney(interestCharge)}`);
}

/**
 * Example 5: Validate Business Rules
 */
export async function demonstrateBusinessRules(): Promise<void> {
  const service = new ProductService();
  const rules = new ProductRules();

  const product = await service.createProduct({
    id: 'rules-demo',
    name: 'Rules Demo Account',
    description: 'For business rules demonstration',
    accountType: AccountType.BASIC,
    status: ProductStatus.ACTIVE,
    fees: [
      { type: FeeType.MONTHLY_MAINTENANCE, amount: createMoney(500, Currency.USD) }
    ],
    minimumBalance: createMoney(50000, Currency.USD), // $500 minimum
    minimumOpeningDeposit: createMoney(10000, Currency.USD), // $100 to open
    overdraftConfig: {
      allowed: true,
      limit: createMoney(50000, Currency.USD), // $500 overdraft
      fee: createMoney(3500, Currency.USD)
    },
    transactionLimits: {
      dailyWithdrawalLimit: createMoney(100000, Currency.USD), // $1000/day
      perTransactionLimit: createMoney(50000, Currency.USD) // $500/transaction
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('\n=== Business Rules Validation ===\n');

  // Test 1: Validate minimum balance
  const balance1 = createMoney(75000, Currency.USD); // $750
  const hasMinBalance = rules.validateMinimumBalance(product, balance1);
  console.log(`Test 1 - Balance $${balance1.amount / 100} meets minimum: ${hasMinBalance}`);

  // Test 2: Calculate available overdraft
  const currentBalance = createMoney(20000, Currency.USD); // $200
  const availableOverdraft = rules.calculateOverdraftAvailable(product, currentBalance);
  console.log(`Test 2 - Available overdraft: ${formatMoney(availableOverdraft)}`);

  // Test 3: Validate withdrawal (should pass)
  const withdrawalAmount = createMoney(30000, Currency.USD); // $300
  try {
    rules.validateWithdrawal(product, currentBalance, withdrawalAmount);
    console.log(`Test 3 - Withdrawal of ${formatMoney(withdrawalAmount)}: APPROVED`);
  } catch (error: any) {
    console.log(`Test 3 - Withdrawal of ${formatMoney(withdrawalAmount)}: REJECTED - ${error.message}`);
  }

  // Test 4: Validate withdrawal (should fail - exceeds available)
  const largeWithdrawal = createMoney(100000, Currency.USD); // $1000
  try {
    rules.validateWithdrawal(product, currentBalance, largeWithdrawal);
    console.log(`Test 4 - Withdrawal of ${formatMoney(largeWithdrawal)}: APPROVED`);
  } catch (error: any) {
    console.log(`Test 4 - Withdrawal of ${formatMoney(largeWithdrawal)}: REJECTED - ${error.message}`);
  }

  // Test 5: Validate minimum opening deposit
  const openingDeposit = createMoney(15000, Currency.USD); // $150
  try {
    rules.validateMinimumOpeningDeposit(product, openingDeposit);
    console.log(`Test 5 - Opening deposit of ${formatMoney(openingDeposit)}: APPROVED`);
  } catch (error: any) {
    console.log(`Test 5 - Opening deposit of ${formatMoney(openingDeposit)}: REJECTED - ${error.message}`);
  }
}

/**
 * Example 6: Calculate Interest
 */
export async function demonstrateInterestCalculations(): Promise<void> {
  const service = new ProductService();
  const rules = new ProductRules();

  const product = await service.createProduct({
    id: 'interest-demo',
    name: 'Interest Demo Account',
    description: 'For interest calculation demonstration',
    accountType: AccountType.PREMIUM,
    status: ProductStatus.ACTIVE,
    fees: [
      { type: FeeType.MONTHLY_MAINTENANCE, amount: createMoney(1000, Currency.USD) }
    ],
    interestConfig: {
      annualRate: 3.0, // 3% APY
      calculationMethod: InterestCalculationMethod.COMPOUND_DAILY,
      minimumBalance: createMoney(100000, Currency.USD), // $1000 minimum
      tieredRates: [
        { threshold: createMoney(0, Currency.USD), rate: 3.0 },
        { threshold: createMoney(1000000, Currency.USD), rate: 3.5 }, // 3.5% for $10k+
        { threshold: createMoney(5000000, Currency.USD), rate: 4.0 }  // 4% for $50k+
      ]
    },
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('\n=== Interest Calculations ===\n');

  // Test different balance tiers
  const balances = [
    createMoney(500000, Currency.USD),   // $5,000
    createMoney(1500000, Currency.USD),  // $15,000
    createMoney(6000000, Currency.USD)   // $60,000
  ];

  for (const balance of balances) {
    const rate = product.getInterestRate(balance);
    const interest30Days = rules.calculateInterest(product, balance, 30);
    const interest365Days = rules.calculateInterest(product, balance, 365);

    console.log(`Balance: ${formatMoney(balance)}`);
    console.log(`Rate: ${rate}%`);
    console.log(`Interest (30 days): ${formatMoney(interest30Days)}`);
    console.log(`Interest (1 year): ${formatMoney(interest365Days)}`);
    console.log('---');
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('=== Product Configuration Examples ===\n');

  await createBasicCheckingProduct();
  await createPremiumCheckingProduct();
  await createBusinessCheckingProduct();
  await demonstrateFeeCalculations();
  await demonstrateBusinessRules();
  await demonstrateInterestCalculations();

  console.log('\n=== All Examples Completed ===');
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
