import mongoose, { Schema, Model } from 'mongoose';

export interface IOrganization {
  _id: string;
  name: string;
  email: string;
  subdomain?: string;
  domain?: string;
  isActive: boolean;
  isVerified: boolean;
  settings: {
    currency?: string;
    timezone?: string;
    taxRate?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
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
    subdomain: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    domain: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true, // Active after email verification
    },
    isVerified: {
      type: Boolean,
      default: true, // Verified after email verification
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {
        currency: 'USD',
        timezone: 'America/New_York',
        taxRate: 0,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OrganizationSchema.index({ email: 1 }, { unique: true });
OrganizationSchema.index({ subdomain: 1 }, { unique: true, sparse: true });
OrganizationSchema.index({ domain: 1 }, { unique: true, sparse: true });
OrganizationSchema.index({ isActive: 1, isVerified: 1 });

// This model is stored in the main database
const Organization: Model<IOrganization> = 
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
