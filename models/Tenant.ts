import mongoose, { Schema, Model } from 'mongoose';

export interface ITenant {
  _id: string;
  name: string;
  subdomain?: string;
  domain?: string;
  isActive: boolean;
  settings: {
    currency?: string;
    timezone?: string;
    taxRate?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    subdomain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TenantSchema.index({ subdomain: 1 });
TenantSchema.index({ domain: 1 });
TenantSchema.index({ isActive: 1 });

// This model is stored in the main database, not tenant-specific
const Tenant: Model<ITenant> = 
  mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);

export default Tenant;
