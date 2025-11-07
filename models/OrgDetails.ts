import mongoose, { Schema, Document } from 'mongoose';

// QR Code subdocument interface
export interface IQRCode {
  _id?: string;
  name: string;
  imageBase64: string;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Organization Details interface
export interface IOrgDetails extends Document {
  organizationId: string;
  name: string;
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
  qrCodes: IQRCode[];
  createdAt: Date;
  updatedAt: Date;
}

// QR Code subdocument schema
const QRCodeSchema = new Schema<IQRCode>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    imageBase64: {
      type: String,
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Organization Details schema
const OrgDetailsSchema = new Schema<IOrgDetails>(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    qrCodes: [QRCodeSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes
OrgDetailsSchema.index({ organizationId: 1 });
OrgDetailsSchema.index({ 'qrCodes.isDefault': 1 });

// Pre-save middleware to ensure only one default QR code
OrgDetailsSchema.pre('save', function(next) {
  if (this.qrCodes && this.qrCodes.length > 0) {
    // Count how many QR codes are marked as default
    const defaultQRs = this.qrCodes.filter(qr => qr.isDefault);
    
    if (defaultQRs.length > 1) {
      // If more than one default, keep only the last one as default
      this.qrCodes.forEach((qr, index) => {
        if (index !== this.qrCodes.length - 1) {
          qr.isDefault = false;
        }
      });
    }
  }
  next();
});

// This model will be registered per tenant connection
export function getOrgDetailsModel(connection: mongoose.Connection) {
  if (connection.models.OrgDetails) {
    return connection.models.OrgDetails as mongoose.Model<IOrgDetails>;
  }
  return connection.model<IOrgDetails>('OrgDetails', OrgDetailsSchema);
}

export default OrgDetailsSchema;
