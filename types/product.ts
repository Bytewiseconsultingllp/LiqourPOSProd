/**
 * Product Purchase Price Interface
 */
export interface ProductPurchasePrice {
  purchasePrice: number; // Purchase price per unit
  batchNumber?: string; // Optional if tracking by batch
  effectiveFrom: string; // Date from which this price is effective
  effectiveTo?: string; // Optional end date for this price, if applicable
  createdAt: string; // When this record was created
  updatedAt?: string; // When this record was last updated
}

/**
 * Tax Information Interface
 */
export interface TaxInfo {
  vat?: number;
  tcs?: number;
  gst?: number;
  cess?: number;
}

/**
 * Product Details Interface
 * Used throughout the application for product management
 */
export interface ProductDetails {
  _id: string; // MongoDB ObjectId as string
  
  // Basic Info
  name: string;
  description?: string;
  imageUrl?: string;
  sku?: string;
  barcode?: string;
  brand: string;
  category: string;

  // Inventory
  currentStock: number; // Total stock in liters or bottles (define clearly in docs)
  volumeML: number; // Volume per unit (e.g., 750ml)
  reorderLevel?: number; // For low-stock alerts
  morningStock?: number;
  morningStockLastUpdatedDate?: string;
  eveningStock?: number;

  // Pricing
  pricePerUnit: number; // Selling price per unit
  purchasePricePerUnit: ProductPurchasePrice[]; // Purchase price per unit (optional)

  // Tax Info
  taxInfo?: TaxInfo; // Contains VAT, TCS, etc.

  // Batch (Optional)
  batchNumber?: string;
  expiryDate?: string;

  // Box Mapping (Optional)
  bottlesPerCaret?: number; // Number of bottles per caret
  noOfCarets?: number; // Number of carets for this product

  // Status
  isActive?: boolean;
  location?: string;

  // Metadata
  createdAt: string;
  updatedAt?: string;
  organizationId?: string; // Added for multi-tenant support
}

// Alias for backward compatibility
export type Product = ProductDetails;

// Re-export Bill, CartItem, and Payment types for convenience
export type { Bill, CartItem, Payment, SubBill } from './bill';
