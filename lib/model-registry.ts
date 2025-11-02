import { Schema } from 'mongoose';
import { registerModelSchema } from './tenant-db';

/**
 * User Model Schema
 */
const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
        message: 'Invalid email format',
      },
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer'],
      default: 'sales',
    },
    organizationId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for User
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ role: 1 });

/**
 * Product Purchase Price Sub-Schema
 */
const ProductPurchasePriceSchema = new Schema({
  purchasePrice: { type: Number, required: true, min: 0 },
  batchNumber: { type: String },
  effectiveFrom: { type: String, required: true },
  effectiveTo: { type: String },
  createdAt: { type: String, required: true },
  updatedAt: { type: String },
}, { _id: false });

/**
 * Tax Info Sub-Schema
 */
const TaxInfoSchema = new Schema({
  vat: { type: Number, min: 0 },
  tcs: { type: Number, min: 0 },
  gst: { type: Number, min: 0 },
  cess: { type: Number, min: 0 },
}, { _id: false });

/**
 * ProductDetails Model Schema (based on ProductDetails interface)
 */
const ProductDetailsSchema = new Schema(
  {
    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    imageUrl: {
      type: String,
    },
    sku: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },

    // Inventory
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    volumeML: {
      type: Number,
      required: true,
      min: 0,
    },
    reorderLevel: {
      type: Number,
      min: 0,
    },
    morningStock: {
      type: Number,
      min: 0,
    },
    morningStockLastUpdatedDate: {
      type: String,
    },
    eveningStock: {
      type: Number,
      min: 0,
    },

    // Pricing
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePricePerUnit: {
      type: [ProductPurchasePriceSchema],
      default: [],
    },

    // Tax Info
    taxInfo: {
      type: TaxInfoSchema,
    },

    // Batch (Optional)
    batchNumber: {
      type: String,
    },
    expiryDate: {
      type: String,
    },

    // Box Mapping (Optional)
    bottlesPerCaret: {
      type: Number,
      min: 0,
    },
    noOfCarets: {
      type: Number,
      min: 0,
    },

    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    location: {
      type: String,
    },

    organizationId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for ProductDetails
ProductDetailsSchema.index({ organizationId: 1, sku: 1 });
ProductDetailsSchema.index({ organizationId: 1, barcode: 1 }, { sparse: true });
ProductDetailsSchema.index({ organizationId: 1, category: 1 });
ProductDetailsSchema.index({ organizationId: 1, brand: 1 });
ProductDetailsSchema.index({ organizationId: 1, name: 1 });
ProductDetailsSchema.index({ name: 'text', description: 'text', brand: 'text' });

/**
 * Sale Model Schema
 */
const SaleSchema = new Schema(
  {
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        productName: String,
        productSku: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'upi'],
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'refunded', 'cancelled'],
      default: 'completed',
    },
    soldBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    soldByName: String,
    organizationId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for Sale
SaleSchema.index({ organizationId: 1, createdAt: -1 });
SaleSchema.index({ soldBy: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ customerPhone: 1 }, { sparse: true });

/**
 * Inventory Transaction Schema
 */
const InventoryTransactionSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    type: {
      type: String,
      enum: ['purchase', 'sale', 'adjustment', 'return'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
    },
    referenceType: {
      type: String,
      enum: ['Sale', 'Purchase', 'Adjustment'],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizationId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for InventoryTransaction
InventoryTransactionSchema.index({ productId: 1, createdAt: -1 });
InventoryTransactionSchema.index({ organizationId: 1, createdAt: -1 });
InventoryTransactionSchema.index({ type: 1 });

/**
 * Customer Model Schema (based on Client interface)
 */
const CustomerSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['Retail', 'Wholesale', 'Walk-In', 'B2B'],
      required: true,
    },
    contactInfo: {
      phone: {
        type: String,
      },
      email: {
        type: String,
        lowercase: true,
      },
      address: {
        type: String,
      },
      gstin: {
        type: String,
      },
    },
    maxDiscountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditLimit: {
      type: Number,
      default: 0,
      min: 0,
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastTransactionDate: {
      type: String,
    },
    openingBalance: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
    },
    organizationId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for Customer
CustomerSchema.index({ organizationId: 1, 'contactInfo.email': 1 });
CustomerSchema.index({ organizationId: 1, type: 1 });
CustomerSchema.index({ organizationId: 1, name: 1 });

/**
 * Vendor Model Schema
 */
const VendorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        lowercase: true,
      },
      address: {
        type: String,
        required: true,
      },
    },
    gstin: {
      type: String,
    },
    paymentTerms: {
      type: String,
    },
    bankDetails: {
      accountName: {
        type: String,
        required: true,
      },
      accountNumber: {
        type: String,
        required: true,
      },
      bankName: {
        type: String,
        required: true,
      },
      ifscCode: {
        type: String,
        required: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tin: {
      type: String,
      required: true,
    },
    cin: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
    },
    vendorPriority: {
      type: Number,
      default: 0,
      min: 0,
    },
    organizationId: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for Vendor
VendorSchema.index({ organizationId: 1, 'contactInfo.email': 1 });
VendorSchema.index({ organizationId: 1, name: 1 });
VendorSchema.index({ organizationId: 1, vendorPriority: -1 });
VendorSchema.index({ organizationId: 1, isActive: 1 });

/**
 * Bill Model Schema
 */
const AppliedPromotionSchema = new Schema({
  promotionId: { type: String, required: true },
  promotionName: { type: String, required: true },
  promotionType: { type: String, enum: ['percentage', 'fixed', 'buy_x_get_y', 'bundle'], required: true },
  discountAmount: { type: Number, required: true },
  description: { type: String },
}, { _id: false });

const BillItemSchema = new Schema({
  productId: { type: String, required: true },
  vendorId: { type: String, required: true },
  productName: { type: String, required: true },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  volumePerUnitML: { type: Number, required: true },
  rate: { type: Number, required: true },
  subTotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  itemDiscountAmount: { type: Number, default: 0 },
  promotionDiscountAmount: { type: Number, default: 0 },
  finalAmount: { type: Number, required: true },
  vatAmount: { type: Number, default: 0 },
  tcsAmount: { type: Number, default: 0 },
});

const SubBillSchema = new Schema({
  items: [BillItemSchema],
  subTotalAmount: { type: Number, required: true },
  totalDiscountAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMode: { type: String, required: true },
  cashPaidAmount: { type: Number, default: 0 },
  onlinePaidAmount: { type: Number, default: 0 },
  creditPaidAmount: { type: Number, default: 0 },
});

const BillSchema = new Schema(
  {
    totalBillId: { type: String, required: true, unique: true, index: true },
    vendorIds: [{ type: String, required: true }],
    userId: { type: String, required: true },
    customerId: { type: String },
    customerName: { type: String, required: true },
    customerPhone: { type: String },
    customerType: { type: String, required: true, enum: ['walk-in', 'registered'] },
    items: [BillItemSchema],
    totalQuantityBottles: { type: Number, required: true },
    totalVolumeML: { type: Number, required: true },
    subTotalAmount: { type: Number, required: true },
    totalDiscountAmount: { type: Number, default: 0 },
    itemDiscountAmount: { type: Number, default: 0 },
    billDiscountAmount: { type: Number, default: 0 },
    promotionDiscountAmount: { type: Number, default: 0 },
    appliedPromotions: [AppliedPromotionSchema],
    totalAmount: { type: Number, required: true },
    subBills: [SubBillSchema],
    saleDate: { type: Date, required: true, default: Date.now },
    payment: {
      mode: { type: String, required: true, enum: ['Cash', 'Online', 'Wallet', 'Credit', 'Mixed'] },
      cashAmount: { type: Number, default: 0 },
      onlineAmount: { type: Number, default: 0 },
      creditAmount: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      transactionId: { type: String },
    },
    organizationId: { type: String, required: true, index: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

BillSchema.index({ totalBillId: 1, organizationId: 1 });
BillSchema.index({ customerId: 1, organizationId: 1 });
BillSchema.index({ saleDate: -1, organizationId: 1 });
BillSchema.index({ createdAt: -1, organizationId: 1 });

/**
 * Purchase Model Schema
 */
const PurchaseItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  brand: { type: String, required: true },
  volumeML: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 0 },
  purchasePricePerUnit: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  batchNumber: { type: String, trim: true },
  expiryDate: { type: Date },
});

const PurchaseSchema = new Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true, trim: true },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
    vendorName: { type: String, required: true },
    purchaseDate: { type: Date, required: true, default: Date.now },
    items: { type: [PurchaseItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    totalQuantity: { type: Number, default: 0 },
    totalVolumeML: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    invoiceNumber: { type: String, trim: true },
    organizationId: { type: String, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

PurchaseSchema.index({ purchaseNumber: 1 });
PurchaseSchema.index({ vendorId: 1 });
PurchaseSchema.index({ purchaseDate: -1 });
PurchaseSchema.index({ organizationId: 1, purchaseDate: -1 });
PurchaseSchema.index({ paymentStatus: 1 });

/**
 * Payment Model Schema
 */
const PaymentSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    customerName: { type: String, required: true },
    cashAmount: { type: Number, required: true, default: 0, min: 0 },
    onlineAmount: { type: Number, required: true, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, required: true, default: Date.now },
    organizationId: { type: String, required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isReverted: { type: Boolean, default: false },
    revertedAt: { type: Date },
    revertedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PaymentSchema.index({ customerId: 1, organizationId: 1 });
PaymentSchema.index({ paymentDate: -1, organizationId: 1 });
PaymentSchema.index({ isReverted: 1 });

/**
 * Register all schemas
 * This should be called once at application startup
 * Safe to call multiple times - will only register once
 */
export function registerAllModels() {
  registerModelSchema('User', UserSchema);
  registerModelSchema('Product', ProductDetailsSchema); // ProductDetails schema registered as 'Product' in DB
  registerModelSchema('Sale', SaleSchema);
  registerModelSchema('InventoryTransaction', InventoryTransactionSchema);
  registerModelSchema('Customer', CustomerSchema);
  registerModelSchema('Vendor', VendorSchema);
  registerModelSchema('Bill', BillSchema);
  registerModelSchema('Purchase', PurchaseSchema);
  registerModelSchema('Payment', PaymentSchema);
  
  console.log('✅ All 9 model schemas registered');
}

// Export schemas for type definitions
export { UserSchema, ProductDetailsSchema, ProductDetailsSchema as ProductSchema, SaleSchema, InventoryTransactionSchema, CustomerSchema, VendorSchema, BillSchema, PurchaseSchema };

// Auto-register models when this module is imported
registerAllModels();
