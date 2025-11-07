import mongoose, { Schema, Model } from 'mongoose';

export interface IPendingOrganization {
  _id: string;
  organizationName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  gstNumber?: string;
  licenseNumber?: string;
  fssaiNumber?: string;
  panNumber?: string;
  website?: string;
  adminName: string;
  hashedPassword: string;
  subdomain?: string;
  verificationToken: string;
  verificationTokenExpires: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingOrganizationSchema = new Schema<IPendingOrganization>(
  {
    organizationName: {
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
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
    },
    fssaiNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    adminName: {
      type: String,
      required: true,
      trim: true,
    },
    hashedPassword: {
      type: String,
      required: true,
    },
    subdomain: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    verificationToken: {
      type: String,
      required: true,
    },
    verificationTokenExpires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PendingOrganizationSchema.index({ email: 1 }, { unique: true });
PendingOrganizationSchema.index({ verificationToken: 1 });
PendingOrganizationSchema.index({ verificationTokenExpires: 1 }); // For cleanup

// Auto-delete expired pending organizations after 24 hours
PendingOrganizationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 86400 } // 24 hours
);

// This model is stored in the main database
const PendingOrganization: Model<IPendingOrganization> = 
  mongoose.models.PendingOrganization || 
  mongoose.model<IPendingOrganization>('PendingOrganization', PendingOrganizationSchema);

export default PendingOrganization;
