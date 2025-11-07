import mongoose, { Schema, Model } from 'mongoose';

export interface IPrintSettings {
  _id: string;
  organizationId: string;
  mainBill: {
    // Header fields
    organizationName: boolean;
    organizationAddress: boolean;
    organizationPhone: boolean;
    organizationGSTIN: boolean;
    
    // Bill info fields
    billNumber: boolean;
    subBillNumber: boolean;
    date: boolean;
    customerName: boolean;
    customerPhone: boolean;
    
    // Item fields
    productName: boolean;
    brand: boolean;
    quantity: boolean;
    rate: boolean;
    volume: boolean;
    itemSubtotal: boolean;
    itemDiscount: boolean;
    
    // Summary fields
    totalItems: boolean;
    totalQuantity: boolean;
    totalVolume: boolean;
    
    // Totals fields
    subtotal: boolean;
    discount: boolean;
    grandTotal: boolean;
    
    // Payment fields
    paymentMode: boolean;
    cashAmount: boolean;
    onlineAmount: boolean;
    creditAmount: boolean;
    
    // Footer fields
    footer: boolean;
  };
  subBill: {
    // Header fields
    organizationName: boolean;
    organizationAddress: boolean;
    organizationPhone: boolean;
    organizationGSTIN: boolean;
    
    // Bill info fields
    billNumber: boolean;
    subBillNumber: boolean;
    date: boolean;
    customerName: boolean;
    customerPhone: boolean;
    
    // Item fields
    productName: boolean;
    brand: boolean;
    quantity: boolean;
    rate: boolean;
    volume: boolean;
    itemSubtotal: boolean;
    itemDiscount: boolean;
    
    // Summary fields
    totalItems: boolean;
    totalQuantity: boolean;
    totalVolume: boolean;
    
    // Totals fields
    subtotal: boolean;
    discount: boolean;
    grandTotal: boolean;
    
    // Payment fields
    paymentMode: boolean;
    cashAmount: boolean;
    onlineAmount: boolean;
    creditAmount: boolean;
    
    // Footer fields
    footer: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const BillFieldSettingsSchema = new Schema({
  // Header
  organizationName: { type: Boolean, default: true },
  organizationAddress: { type: Boolean, default: true },
  organizationPhone: { type: Boolean, default: true },
  organizationGSTIN: { type: Boolean, default: true },
  
  // Bill info
  billNumber: { type: Boolean, default: true },
  subBillNumber: { type: Boolean, default: true },
  date: { type: Boolean, default: true },
  customerName: { type: Boolean, default: true },
  customerPhone: { type: Boolean, default: true },
  
  // Items
  productName: { type: Boolean, default: true },
  brand: { type: Boolean, default: true },
  quantity: { type: Boolean, default: true },
  rate: { type: Boolean, default: true },
  volume: { type: Boolean, default: true },
  itemSubtotal: { type: Boolean, default: true },
  itemDiscount: { type: Boolean, default: true },
  
  // Summary
  totalItems: { type: Boolean, default: true },
  totalQuantity: { type: Boolean, default: true },
  totalVolume: { type: Boolean, default: true },
  
  // Totals
  subtotal: { type: Boolean, default: true },
  discount: { type: Boolean, default: true },
  grandTotal: { type: Boolean, default: true },
  
  // Payment
  paymentMode: { type: Boolean, default: true },
  cashAmount: { type: Boolean, default: true },
  onlineAmount: { type: Boolean, default: true },
  creditAmount: { type: Boolean, default: true },
  
  // Footer
  footer: { type: Boolean, default: true },
}, { _id: false });

const PrintSettingsSchema = new Schema<IPrintSettings>(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    mainBill: {
      type: BillFieldSettingsSchema,
      default: () => ({}),
    },
    subBill: {
      type: BillFieldSettingsSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup by organization
PrintSettingsSchema.index({ organizationId: 1 });

// Helper method to get or create default settings
PrintSettingsSchema.statics.getOrCreateForOrganization = async function(organizationId: string) {
  let settings = await this.findOne({ organizationId });
  
  if (!settings) {
    settings = await this.create({
      organizationId,
      mainBill: {},
      subBill: {},
    });
  }
  
  return settings;
};

// This model is stored in the tenant database
const getPrintSettingsModel = (connection?: mongoose.Connection): Model<IPrintSettings> => {
  if (connection) {
    return connection.models.PrintSettings || connection.model<IPrintSettings>('PrintSettings', PrintSettingsSchema);
  }
  return mongoose.models.PrintSettings || mongoose.model<IPrintSettings>('PrintSettings', PrintSettingsSchema);
};

export default getPrintSettingsModel;
