import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface ISaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ISale {
  _id: string;
  saleNumber: string;
  items: ISaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital' | 'other';
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  customerId?: string;
  customerName?: string;
  notes?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitPrice: {
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
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    saleNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [SaleItemSchema],
      required: true,
      validate: {
        validator: (items: ISaleItem[]) => items.length > 0,
        message: 'Sale must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'digital', 'other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'cancelled', 'refunded'],
      default: 'completed',
    },
    customerId: {
      type: String,
    },
    customerName: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SaleSchema.index({ saleNumber: 1 });
SaleSchema.index({ status: 1 });
SaleSchema.index({ paymentMethod: 1 });
SaleSchema.index({ createdAt: -1 });
SaleSchema.index({ customerId: 1 });

/**
 * Get Sale model for a specific tenant connection
 */
export function getSaleModel(connection: Connection): Model<ISale> {
  if (connection.models.Sale) {
    return connection.models.Sale as Model<ISale>;
  }
  return connection.model<ISale>('Sale', SaleSchema);
}

export default SaleSchema;
