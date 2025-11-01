/**
 * Vendor Interface
 * Used throughout the application for vendor management
 */
export interface Vendor {
  _id?: string;
  name: string;
  tin: string;
  cin?: string;
  gstin?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  contactInfo?: {
    phone: string;
    email: string;
    address: string;
  };
  paymentTerms?: string;
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    ifscCode?: string;
  };
  isActive?: boolean;
  notes?: string;
  priority?: number; // Vendor priority (1 is highest)
  vendorPriority?: number; // Legacy field
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string; // Multi-tenant support
}
