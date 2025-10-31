import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IProduct {
  _id: string;
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  cost?: number;
  stockQuantity: number;
  minStockLevel?: number;
  alcoholContent?: number;
  volume?: number;
  volumeUnit?: 'ml' | 'l' | 'oz' | 'gal';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
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
      unique: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true,
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
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minStockLevel: {
      type: Number,
      default: 0,
      min: 0,
    },
    alcoholContent: {
      type: Number,
      min: 0,
      max: 100,
    },
    volume: {
      type: Number,
      min: 0,
    },
    volumeUnit: {
      type: String,
      enum: ['ml', 'l', 'oz', 'gal'],
      default: 'ml',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ProductSchema.index({ sku: 1 });
ProductSchema.index({ barcode: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

/**
 * Get Product model for a specific tenant connection
 * This ensures each tenant has their own products collection
 */
export function getProductModel(connection: Connection): Model<IProduct> {
  if (connection.models.Product) {
    return connection.models.Product as Model<IProduct>;
  }
  return connection.model<IProduct>('Product', ProductSchema);
}

export default ProductSchema;
