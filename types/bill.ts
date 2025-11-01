/**
 * SubBill Interface
 * Represents a split bill when a main bill is divided
 */
export interface SubBill {
  _id?: number;
  parentBillId: string;
  items: CartItem[];
  subTotalAmount: number;
  totalDiscountAmount: number;
  totalAmount: number;
  paymentMode: "Cash" | "Online" | "Wallet" | "Credit" | "Mixed";
  cashPaidAmount: number;
  onlinePaidAmount: number;
  creditPaidAmount: number;
  createdAt: string;
}

/**
 * Bill Interface
 * Represents a complete sales transaction/bill
 */
export interface Bill {
  _id?: number;
  totalBillId: string;
  vendorIds: string[];
  userId: string; // User (Salesperson) who created the bill
  customerId: string | undefined; // Optional if customer is not registered
  customerName: string | undefined; // Optional if customer is not registered
  customerPhone: string | undefined; // Optional if customer is not registered
  customerType: string | undefined; // Optional if customer is not registered
  items: CartItem[];
  totalQuantityBottles: number;
  subTotalAmount: number; // Amount before discounts
  totalDiscountAmount: number;
  subBills?: SubBill[]; // Array of sub-bills if this bill is split
  totalAmount: number; // Final payable amount
  saleDate: string; // Consider using Date type
  payement: Payment;
  createdAt: string; // Consider using Date type
  updatedAt?: string; // Consider using Date type
}

/**
 * CartItem Interface
 * Represents an individual item in the shopping cart or bill
 */
export interface CartItem {
  _id: string; // Good for individual bill items to have an ID
  productId: string;
  vendorId: string;
  billId: number;
  productName: string;
  brand: string; // Brand of the product
  category: string; // Category of the product
  quantity: number; // Number of units
  volumePerUnitML: number; // Store volume at time of billing for consistency
  rate: number; // Price per unit at time of billing
  subTotal: number; // quantity * rate
  discountAmount?: number; // total (manual + promo)
  manualDiscountAmount?: number; // NEW: cashier discount
  promoDiscountAmount?: number; // NEW: offer/promo discount
  itemDiscountAmount?: number;
  finalAmount: number; // (subTotal + taxAmount) - discountAmount
  vatAmount?: number; // Calculated at time of billing
  tcsAmount?: number; // Calculated at time of billing
  promotionsApplied?: any[];
}

/**
 * Payment Interface
 * Represents payment information for a transaction
 */
export interface Payment {
  mode?: "Cash" | "Online" | "Wallet" | "Credit" | "Mixed";
  method?: "cash" | "credit" | "online" | "wallet" | "mixed"; // Alternative naming
  cashAmount?: number;
  cash?: number; // Alias for cashAmount
  onlineAmount?: number;
  online?: number; // Alias for onlineAmount
  creditAmount?: number;
  credit?: number; // Alias for creditAmount
  totalAmount?: number;
  transactionId?: string;
  timestamp?: string;
}
