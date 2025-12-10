/**
 * Product Service
 * Manages product lifecycle and operations
 */

import { Money } from '../core/domain';
import {
  ProductConfiguration,
  ProductFilters,
  ProductStatus,
  ValidationError
} from './types';
import { Product } from './product';

export class ProductService {
  private products: Map<string, Product>;

  constructor() {
    this.products = new Map();
  }

  /**
   * Create a new product
   */
  async createProduct(config: ProductConfiguration): Promise<Product> {
    // Validate that product ID doesn't already exist
    if (this.products.has(config.id)) {
      throw new ValidationError(`Product with ID ${config.id} already exists`);
    }

    // Set timestamps
    const now = new Date();
    const productConfig: ProductConfiguration = {
      ...config,
      createdAt: now,
      updatedAt: now
    };

    // Create and store the product
    const product = new Product(productConfig);
    this.products.set(product.id, product);

    return product;
  }

  /**
   * Get a product by ID
   */
  async getProduct(productId: string): Promise<Product> {
    const product = this.products.get(productId);

    if (!product) {
      throw new ValidationError(`Product with ID ${productId} not found`);
    }

    return product;
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    productId: string,
    updates: Partial<ProductConfiguration>
  ): Promise<Product> {
    const existingProduct = await this.getProduct(productId);
    const currentConfig = existingProduct.toConfiguration();

    // Merge updates with existing configuration
    const updatedConfig: ProductConfiguration = {
      ...currentConfig,
      ...updates,
      id: currentConfig.id, // Prevent ID changes
      createdAt: currentConfig.createdAt, // Preserve creation date
      updatedAt: new Date() // Update timestamp
    };

    // Create new product instance with updated config
    const updatedProduct = new Product(updatedConfig);

    // Replace in storage
    this.products.set(productId, updatedProduct);

    return updatedProduct;
  }

  /**
   * List products with optional filters
   */
  async listProducts(filters?: ProductFilters): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (!filters) {
      return products;
    }

    // Apply filters
    if (filters.accountType) {
      products = products.filter(p => p.accountType === filters.accountType);
    }

    if (filters.status) {
      products = products.filter(p => p.status === filters.status);
    }

    if (filters.activeOnly) {
      products = products.filter(p => p.isActive());
    }

    if (filters.hasOverdraft !== undefined) {
      products = products.filter(p => p.hasOverdraftProtection() === filters.hasOverdraft);
    }

    if (filters.minInterestRate !== undefined) {
      products = products.filter(p => {
        if (!p.interestConfig) return false;
        return p.interestConfig.annualRate >= filters.minInterestRate!;
      });
    }

    return products;
  }

  /**
   * Activate a product
   */
  async activateProduct(productId: string): Promise<Product> {
    return this.updateProduct(productId, {
      status: ProductStatus.ACTIVE
    });
  }

  /**
   * Deactivate a product
   */
  async deactivateProduct(productId: string): Promise<Product> {
    return this.updateProduct(productId, {
      status: ProductStatus.INACTIVE
    });
  }

  /**
   * Suspend a product
   */
  async suspendProduct(productId: string): Promise<Product> {
    return this.updateProduct(productId, {
      status: ProductStatus.SUSPENDED
    });
  }

  /**
   * Deprecate a product
   */
  async deprecateProduct(productId: string): Promise<Product> {
    return this.updateProduct(productId, {
      status: ProductStatus.DEPRECATED
    });
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId: string): Promise<void> {
    const product = await this.getProduct(productId);

    // Only allow deletion of inactive or deprecated products
    if (product.status === ProductStatus.ACTIVE || product.status === ProductStatus.SUSPENDED) {
      throw new ValidationError('Cannot delete active or suspended products. Deactivate or deprecate first.');
    }

    this.products.delete(productId);
  }

  /**
   * Check if a product exists
   */
  async productExists(productId: string): Promise<boolean> {
    return this.products.has(productId);
  }

  /**
   * Get products by account type
   */
  async getProductsByAccountType(accountType: string): Promise<Product[]> {
    return this.listProducts({ accountType: accountType as any });
  }

  /**
   * Get all active products
   */
  async getActiveProducts(): Promise<Product[]> {
    return this.listProducts({ activeOnly: true });
  }

  /**
   * Get products with overdraft protection
   */
  async getProductsWithOverdraft(): Promise<Product[]> {
    return this.listProducts({ hasOverdraft: true });
  }

  /**
   * Get products with interest
   */
  async getProductsWithInterest(): Promise<Product[]> {
    const allProducts = await this.listProducts();
    return allProducts.filter(p => p.hasInterest());
  }

  /**
   * Clear all products (for testing)
   */
  async clearAllProducts(): Promise<void> {
    this.products.clear();
  }

  /**
   * Get total product count
   */
  async getProductCount(): Promise<number> {
    return this.products.size;
  }

  /**
   * Bulk create products
   */
  async bulkCreateProducts(configs: ProductConfiguration[]): Promise<Product[]> {
    const createdProducts: Product[] = [];
    const errors: Array<{ config: ProductConfiguration; error: Error }> = [];

    for (const config of configs) {
      try {
        const product = await this.createProduct(config);
        createdProducts.push(product);
      } catch (error) {
        errors.push({ config, error: error as Error });
      }
    }

    if (errors.length > 0) {
      console.warn(`Failed to create ${errors.length} products:`, errors);
    }

    return createdProducts;
  }
}
