/**
 * Customer/Client Interface
 * Used throughout the application for customer management
 */
export interface Customer {
  _id: string;
  name: string;
  type: "Retail" | "Wholesale" | "Walk-In" | "B2B";
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
    gstin?: string; // Goods and Services Tax Identification Number
  };
  maxDiscountPercentage?: number;
  walletBalance: number;
  creditLimit: number;
  outstandingBalance?: number;
  lastTransactionDate?: string;
  openingBalance?: number;
  isActive?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  organizationId?: string; // Added for multi-tenant support
}

// Alias for backward compatibility
export type Client = Customer;
