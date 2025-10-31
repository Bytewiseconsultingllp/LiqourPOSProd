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
      enum: ['admin', 'manager', 'staff'],
      default: 'staff',
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
 * Product Model Schema
 */
const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    cost: {
      type: Number,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ['bottle', 'case', 'pack', 'unit'],
      default: 'bottle',
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Indexes for Product
ProductSchema.index({ sku: 1 }, { unique: true });
ProductSchema.index({ barcode: 1 }, { sparse: true });
ProductSchema.index({ category: 1 });
ProductSchema.index({ organizationId: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

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
 * Register all schemas
 * This should be called once at application startup
 */
export function registerAllModels() {
  registerModelSchema('User', UserSchema);
  registerModelSchema('Product', ProductSchema);
  registerModelSchema('Sale', SaleSchema);
  registerModelSchema('InventoryTransaction', InventoryTransactionSchema);
  
  console.log('✅ All model schemas registered');
}

// Export schemas for type definitions
export { UserSchema, ProductSchema, SaleSchema, InventoryTransactionSchema };
