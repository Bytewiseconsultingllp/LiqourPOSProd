import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IVendor {
  _id: string;
  name: string;
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
  gstin?: string;
  paymentTerms?: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
  };
  isActive: boolean;
  tin: string;
  cin: string;
  notes?: string;
  vendorPriority: number;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

const VendorSchema = new Schema<IVendor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactInfo: {
      phone: {
        type: String,
        required: true,
        trim: true,
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      address: {
        type: String,
        required: true,
        trim: true,
      },
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    paymentTerms: {
      type: String,
      trim: true,
    },
    bankDetails: {
      accountName: {
        type: String,
        required: true,
        trim: true,
      },
      accountNumber: {
        type: String,
        required: true,
        trim: true,
      },
      bankName: {
        type: String,
        required: true,
        trim: true,
      },
      ifscCode: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    tin: {
      type: String,
      required: true,
      trim: true,
    },
    cin: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    vendorPriority: {
      type: Number,
      default: 0,
      min: 0,
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

// Indexes
VendorSchema.index({ name: 1, organizationId: 1 });
VendorSchema.index({ isActive: 1, organizationId: 1 });
VendorSchema.index({ 'contactInfo.email': 1, organizationId: 1 });

/**
 * Get Vendor model for a specific tenant connection
 */
export function getVendorModel(connection: Connection): Model<IVendor> {
  if (connection.models.Vendor) {
    return connection.models.Vendor as Model<IVendor>;
  }
  return connection.model<IVendor>('Vendor', VendorSchema);
}

export default VendorSchema;
