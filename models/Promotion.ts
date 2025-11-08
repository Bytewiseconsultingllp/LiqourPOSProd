import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IPromotion {
  _id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed' | 'buy_x_get_y';
  
  // Discount details
  discountPercentage?: number; // For percentage type
  discountAmount?: number; // For fixed amount type
  
  // Buy X Get Y details
  buyQuantity?: number; // Buy X items
  getQuantity?: number; // Get Y items free
  
  // Applicability
  applicableOn: 'all' | 'category' | 'product' | 'brand';
  categoryIds?: string[]; // If applicable on category
  productIds?: string[]; // If applicable on specific products
  brandNames?: string[]; // If applicable on brands
  
  // Conditions
  minPurchaseAmount?: number; // Minimum purchase amount to apply
  maxDiscountAmount?: number; // Maximum discount cap
  
  // Validity
  startDate: Date;
  endDate: Date;
  
  // Status
  isActive: boolean;
  priority?: number; // Higher priority promotions apply first
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  organizationId?: string;
}

const PromotionSchema = new Schema<IPromotion>(
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
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'buy_x_get_y'],
      required: true,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      min: 0,
    },
    buyQuantity: {
      type: Number,
      min: 1,
    },
    getQuantity: {
      type: Number,
      min: 1,
    },
    applicableOn: {
      type: String,
      enum: ['all', 'category', 'product', 'brand'],
      required: true,
      default: 'all',
    },
    categoryIds: [{
      type: String,
    }],
    productIds: [{
      type: String,
    }],
    brandNames: [{
      type: String,
    }],
    minPurchaseAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
    },
    organizationId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PromotionSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
PromotionSchema.index({ type: 1 });
PromotionSchema.index({ applicableOn: 1 });
PromotionSchema.index({ organizationId: 1 });

/**
 * Get Promotion model for a specific tenant connection
 */
export function getPromotionModel(connection: Connection): Model<IPromotion> {
  if (connection.models.Promotion) {
    return connection.models.Promotion as Model<IPromotion>;
  }
  return connection.model<IPromotion>('Promotion', PromotionSchema);
}

export default PromotionSchema;
