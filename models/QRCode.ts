import mongoose, { Schema, Model } from 'mongoose';

export interface IQRCode {
  _id: string;
  organizationId: string;
  name: string;
  imageBase64: string; // Base64 encoded image
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QRCodeSchema = new Schema<IQRCode>(
  {
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
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

// Indexes
QRCodeSchema.index({ organizationId: 1, isDefault: 1 });
QRCodeSchema.index({ organizationId: 1, name: 1 });

// Ensure only one default QR per organization
QRCodeSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // If this QR is being set as default, unset all other defaults for this organization
    await mongoose.model('QRCode').updateMany(
      { organizationId: this.organizationId, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// This model is stored in the main database
const QRCode: Model<IQRCode> = 
  mongoose.models.QRCode || mongoose.model<IQRCode>('QRCode', QRCodeSchema);

export default QRCode;
