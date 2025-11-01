import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  brand: string;
  volumeML: number;
  quantity: number;
  purchasePricePerUnit: number;
  totalAmount: number;
  batchNumber?: string;
  expiryDate?: Date;
}

export interface IPurchase {
  _id: string;
  purchaseNumber: string;
  vendorId: mongoose.Types.ObjectId;
  vendorName: string;
  purchaseDate: Date;
  items: IPurchaseItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid';
  paidAmount: number;
  dueAmount: number;
  notes?: string;
  invoiceNumber?: string;
  organizationId: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  volumeML: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  purchasePricePerUnit: {
    type: Number,
    required: true,
    min: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  batchNumber: {
    type: String,
    trim: true,
  },
  expiryDate: {
    type: Date,
  },
});

const PurchaseSchema = new Schema<IPurchase>(
  {
    purchaseNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
    vendorName: {
      type: String,
      required: true,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    items: {
      type: [PurchaseItemSchema],
      required: true,
      validate: {
        validator: function(items: IPurchaseItem[]) {
          return items.length > 0;
        },
        message: 'Purchase must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid'],
      default: 'pending',
    },
    paidAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    dueAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    notes: {
      type: String,
      trim: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
PurchaseSchema.index({ purchaseNumber: 1 });
PurchaseSchema.index({ vendorId: 1 });
PurchaseSchema.index({ purchaseDate: -1 });
PurchaseSchema.index({ organizationId: 1, purchaseDate: -1 });
PurchaseSchema.index({ paymentStatus: 1 });

/**
 * Get Purchase model for a specific tenant connection
 */
export function getPurchaseModel(connection: Connection): Model<IPurchase> {
  if (connection.models.Purchase) {
    return connection.models.Purchase as Model<IPurchase>;
  }
  return connection.model<IPurchase>('Purchase', PurchaseSchema);
}

export default PurchaseSchema;
