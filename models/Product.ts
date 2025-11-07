import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IBarcode {
  code: string;
  createdAt: Date;
  createdBy?: string;
}

export interface IProductDetails {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string; // Deprecated - kept for backward compatibility
  imageBase64?: string; // New: Base64 encoded image
  imageMimeType?: string; // MIME type of the image (e.g., image/jpeg)
  sku?: string;
  barcode?: string; // Deprecated - kept for backward compatibility
  barcodes?: IBarcode[]; // New: Multiple barcodes support
  brand: string;
  category: string;
  
  // Inventory
  currentStock: number;
  volumeML: number;
  reorderLevel?: number;
  morningStock?: number;
  morningStockLastUpdatedDate?: Date;
  morningStockUpdateDate?: Date;
  eveningStock?: number;
  
  // Pricing
  pricePerUnit: number;
  purchasePricePerUnit?: any[];
  
  // Tax Info
  taxInfo?: {
    vat?: number;
    tcs?: number;
    gst?: number;
    cess?: number;
  };
  
  // Batch (Optional)
  batchNumber?: string;
  expiryDate?: Date;
  
  // Box Mapping (Optional)
  bottlesPerCaret?: number;
  noOfCarets?: number;
  noOfBottlesPerCaret?: number; // Number of bottles per caret
  
  // Status
  isActive: boolean;
  location?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  organizationId?: string;
}

// Alias for backward compatibility
export type IProduct = IProductDetails;

const ProductDetailsSchema = new Schema<IProductDetails>(
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
    imageUrl: {
      type: String,
      trim: true,
    },
    imageBase64: {
      type: String,
    },
    imageMimeType: {
      type: String,
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    barcodes: {
      type: [
        {
          code: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
          createdBy: { type: String },
        },
      ],
      default: [],
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
    },
    volumeML: {
      type: Number,
      required: true,
    },
    reorderLevel: {
      type: Number,
      default: 0,
    },
    morningStock: {
      type: Number,
    },
    morningStockLastUpdatedDate: {
      type: Date,
    },
    morningStockUpdateDate: {
      type: Date,
    },
    eveningStock: {
      type: Number,
    },
    // Pricing
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
    },
    purchasePricePerUnit: {
      type: [Schema.Types.Mixed],
    },
    // Tax Info
    taxInfo: {
      vat: { type: Number },
      tcs: { type: Number },
      gst: { type: Number },
      cess: { type: Number },
    },
    // Batch
    batchNumber: {
      type: String,
    },
    expiryDate: {
      type: Date,
    },
    // Box Mapping
    bottlesPerCaret: {
      type: Number,
    },
    noOfCarets: {
      type: Number,
    },
    noOfBottlesPerCaret: {
      type: Number,
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
    },
  },
  {
    timestamps: true,
  }
);

// Indexes (sparse allows null/undefined values)
ProductDetailsSchema.index({ sku: 1 }, { sparse: true });
ProductDetailsSchema.index({ barcode: 1 }, { sparse: true });
ProductDetailsSchema.index({ category: 1 });
ProductDetailsSchema.index({ isActive: 1 });
ProductDetailsSchema.index({ name: 'text', description: 'text' });
ProductDetailsSchema.index({ organizationId: 1 });

/**
 * Get ProductDetails model for a specific tenant connection
 * This ensures each tenant has their own products collection
 * Note: Uses 'Product' as the collection name in MongoDB
 */
export function getProductDetailsModel(connection: Connection): Model<IProductDetails> {
  if (connection.models.Product) {
    return connection.models.Product as Model<IProductDetails>;
  }
  return connection.model<IProductDetails>('Product', ProductDetailsSchema);
}

/**
 * @deprecated Use getProductDetailsModel instead
 * Kept for backward compatibility
 */
export function getProductModel(connection: Connection): Model<IProductDetails> {
  return getProductDetailsModel(connection);
}

export default ProductDetailsSchema;
export { ProductDetailsSchema };
