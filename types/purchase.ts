/**
 * Purchase Entry Types
 * Used for managing product purchases from vendors
 */

export interface PurchaseItem {
  productId: string;
  productName: string;
  brand: string;
  volumeML: number;
  quantity: number;
  purchasePricePerUnit: number;
  totalAmount: number;
  batchNumber?: string;
  expiryDate?: string;
  // UI-specific fields for cart display
  carets?: number;
  pieces?: number;
  pricePerCaret?: number;
  amount?: number;
}

export interface Purchase {
  _id?: string;
  purchaseNumber: string; // Auto-generated unique purchase number
  vendorId: string;
  vendorName: string;
  purchaseDate: string; // ISO date string
  items: PurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  invoiceNumber?: string;
  organizationId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface VendorStock {
  _id?: string;
  vendorId: string;
  productId: string;
  productName: string;
  brand: string;
  volumeML: number;
  currentStock: number;
  lastPurchasePrice: number;
  lastPurchaseDate: string;
  organizationId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreatePurchaseRequest {
  vendorId: string;
  purchaseDate: string;
  items: Omit<PurchaseItem, 'productName' | 'brand' | 'volumeML' | 'totalAmount'>[];
  taxAmount: number;
  paidAmount: number;
  notes?: string;
  invoiceNumber?: string;
}

export interface PurchaseResponse {
  success: boolean;
  data?: Purchase;
  error?: string;
}
