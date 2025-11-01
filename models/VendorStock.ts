import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IVendorStock {
  _id: string;
  vendorId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  productName: string;
  brand: string;
  volumeML: number;
  currentStock: number;
  lastPurchasePrice: number;
  lastPurchaseDate: Date;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorStockSchema = new Schema<IVendorStock>(
  {
    vendorId: {
      type: Schema.Types.ObjectId,
      ref: 'Vendor',
      required: true,
    },
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
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastPurchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    lastPurchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to ensure one stock record per vendor-product combination
VendorStockSchema.index(
  { vendorId: 1, productId: 1, organizationId: 1 },
  { unique: true }
);

// Additional indexes for queries
VendorStockSchema.index({ vendorId: 1, organizationId: 1 });
VendorStockSchema.index({ productId: 1, organizationId: 1 });

/**
 * Get VendorStock model for a specific tenant connection
 */
export function getVendorStockModel(connection: Connection): Model<IVendorStock> {
  if (connection.models.VendorStock) {
    return connection.models.VendorStock as Model<IVendorStock>;
  }
  return connection.model<IVendorStock>('VendorStock', VendorStockSchema);
}

export default VendorStockSchema;
