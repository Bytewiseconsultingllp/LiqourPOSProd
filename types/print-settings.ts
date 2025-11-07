/**
 * Print Settings Types
 * Defines which fields should be printed on bills and sub-bills
 */

export interface BillFieldSettings {
  // Header fields
  organizationName: boolean;
  organizationAddress: boolean;
  organizationPhone: boolean;
  organizationGSTIN: boolean;
  
  // Bill info fields
  billNumber: boolean;
  subBillNumber: boolean;
  date: boolean;
  customerName: boolean;
  customerPhone: boolean;
  
  // Item fields
  productName: boolean;
  brand: boolean;
  quantity: boolean;
  rate: boolean;
  volume: boolean;
  itemSubtotal: boolean;
  itemDiscount: boolean;
  
  // Summary fields
  totalItems: boolean;
  totalQuantity: boolean;
  totalVolume: boolean;
  
  // Totals fields
  subtotal: boolean;
  discount: boolean;
  grandTotal: boolean;
  
  // Payment fields
  paymentMode: boolean;
  cashAmount: boolean;
  onlineAmount: boolean;
  creditAmount: boolean;
  
  // Footer fields
  footer: boolean;
}

export interface PrintSettings {
  mainBill: BillFieldSettings;
  subBill: BillFieldSettings;
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  mainBill: {
    // Header
    organizationName: true,
    organizationAddress: true,
    organizationPhone: true,
    organizationGSTIN: true,
    
    // Bill info
    billNumber: true,
    subBillNumber: false,
    date: true,
    customerName: true,
    customerPhone: true,
    
    // Items
    productName: true,
    brand: true,
    quantity: true,
    rate: true,
    volume: true,
    itemSubtotal: true,
    itemDiscount: true,
    
    // Summary
    totalItems: true,
    totalQuantity: true,
    totalVolume: true,
    
    // Totals
    subtotal: true,
    discount: true,
    grandTotal: true,
    
    // Payment
    paymentMode: true,
    cashAmount: true,
    onlineAmount: true,
    creditAmount: true,
    
    // Footer
    footer: true,
  },
  subBill: {
    // Header
    organizationName: true,
    organizationAddress: true,
    organizationPhone: true,
    organizationGSTIN: true,
    
    // Bill info
    billNumber: true,
    subBillNumber: true,
    date: true,
    customerName: true,
    customerPhone: true,
    
    // Items
    productName: true,
    brand: true,
    quantity: true,
    rate: true,
    volume: true,
    itemSubtotal: true,
    itemDiscount: true,
    
    // Summary
    totalItems: true,
    totalQuantity: true,
    totalVolume: true,
    
    // Totals
    subtotal: true,
    discount: true,
    grandTotal: true,
    
    // Payment
    paymentMode: true,
    cashAmount: true,
    onlineAmount: true,
    creditAmount: true,
    
    // Footer
    footer: true,
  },
};

export const FIELD_LABELS: Record<keyof BillFieldSettings, string> = {
  organizationName: 'Organization Name',
  organizationAddress: 'Organization Address',
  organizationPhone: 'Organization Phone',
  organizationGSTIN: 'GSTIN Number',
  billNumber: 'Bill Number',
  subBillNumber: 'Sub-Bill Number',
  date: 'Date & Time',
  customerName: 'Customer Name',
  customerPhone: 'Customer Phone',
  productName: 'Product Name',
  brand: 'Brand',
  quantity: 'Quantity',
  rate: 'Rate/Price',
  volume: 'Volume (ML)',
  itemSubtotal: 'Item Subtotal',
  itemDiscount: 'Item Discount',
  totalItems: 'Total Items Count',
  totalQuantity: 'Total Quantity',
  totalVolume: 'Total Volume',
  subtotal: 'Subtotal Amount',
  discount: 'Total Discount',
  grandTotal: 'Grand Total',
  paymentMode: 'Payment Mode',
  cashAmount: 'Cash Amount',
  onlineAmount: 'Online Amount',
  creditAmount: 'Credit Amount',
  footer: 'Thank You Message',
};

export const FIELD_CATEGORIES = {
  header: ['organizationName', 'organizationAddress', 'organizationPhone', 'organizationGSTIN'],
  billInfo: ['billNumber', 'subBillNumber', 'date', 'customerName', 'customerPhone'],
  items: ['productName', 'brand', 'quantity', 'rate', 'volume', 'itemSubtotal', 'itemDiscount'],
  summary: ['totalItems', 'totalQuantity', 'totalVolume'],
  totals: ['subtotal', 'discount', 'grandTotal'],
  payment: ['paymentMode', 'cashAmount', 'onlineAmount', 'creditAmount'],
  footer: ['footer'],
};
