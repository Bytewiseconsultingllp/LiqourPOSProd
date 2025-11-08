import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IAppliedPromotion {
  promotionId: string;
  promotionName: string;
  promotionType: 'percentage' | 'fixed' | 'buy_x_get_y' | 'bundle';
  discountAmount: number;
  description?: string;
}

export interface IBillItem {
  productId: string;
  vendorId: string;
  productName: string;
  brand: string;
  category: string;
  quantity: number;
  volumePerUnitML: number;
  rate: number;
  subTotal: number;
  discountAmount: number;
  itemDiscountAmount?: number; // Manual item-level discount
  promotionDiscountAmount?: number; // Promotion-based discount
  finalAmount: number;
  vatAmount: number;
  tcsAmount: number;
}

export interface ISubBill {
  items: IBillItem[];
  subTotalAmount: number;
  totalDiscountAmount: number;
  totalAmount: number;
  paymentMode: string;
  cashPaidAmount: number;
  onlinePaidAmount: number;
  creditPaidAmount: number;
}

export interface IBill {
  _id: string;
  totalBillId: string;
  vendorIds: string[];
  userId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerType: string;
  items: IBillItem[];
  totalQuantityBottles: number;
  totalVolumeML: number;
  subTotalAmount: number;
  totalDiscountAmount: number;
  itemDiscountAmount?: number; // Manual item discounts total
  billDiscountAmount?: number; // Bill-level discount
  promotionDiscountAmount?: number; // Total promotion discounts
  appliedPromotions?: IAppliedPromotion[]; // List of applied promotions
  totalAmount: number;
  subBills?: ISubBill[];
  saleDate: Date;
  payment: {
    mode: string;
    cashAmount: number;
    onlineAmount: number;
    creditAmount: number;
    totalAmount: number;
    transactionId?: string;
  };
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppliedPromotionSchema = new Schema({
  promotionId: {
    type: String,
    required: true,
  },
  promotionName: {
    type: String,
    required: true,
  },
  promotionType: {
    type: String,
    enum: ['percentage', 'fixed', 'buy_x_get_y', 'bundle'],
    required: true,
  },
  discountAmount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
  },
}, { _id: false });

const BillItemSchema = new Schema({
  productId: {
    type: String,
    required: true,
  },
  vendorId: {
    type: String,
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  brand: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  volumePerUnitML: {
    type: Number,
    required: true,
  },
  rate: {
    type: Number,
    required: true,
  },
  subTotal: {
    type: Number,
    required: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  itemDiscountAmount: {
    type: Number,
    default: 0,
  },
  promotionDiscountAmount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  vatAmount: {
    type: Number,
    default: 0,
  },
  tcsAmount: {
    type: Number,
    default: 0,
  },
});

const SubBillSchema = new Schema({
  items: [BillItemSchema],
  subTotalAmount: {
    type: Number,
    required: true,
  },
  totalDiscountAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  paymentMode: {
    type: String,
    required: true,
  },
  cashPaidAmount: {
    type: Number,
    default: 0,
  },
  onlinePaidAmount: {
    type: Number,
    default: 0,
  },
  creditPaidAmount: {
    type: Number,
    default: 0,
  },
});

const BillSchema = new Schema<IBill>(
  {
    totalBillId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    vendorIds: [{
      type: String,
      required: true,
    }],
    userId: {
      type: String,
      required: true,
    },
    customerId: {
      type: String,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
    },
    customerType: {
      type: String,
      required: true,
      enum: ['Walk-In', 'Retail', 'B2B', 'Wholesale'],
    },
    items: [BillItemSchema],
    totalQuantityBottles: {
      type: Number,
      required: true,
    },
    totalVolumeML: {
      type: Number,
      required: true,
    },
    subTotalAmount: {
      type: Number,
      required: true,
    },
    totalDiscountAmount: {
      type: Number,
      default: 0,
    },
    itemDiscountAmount: {
      type: Number,
      default: 0,
    },
    billDiscountAmount: {
      type: Number,
      default: 0,
    },
    promotionDiscountAmount: {
      type: Number,
      default: 0,
    },
    appliedPromotions: [AppliedPromotionSchema],
    totalAmount: {
      type: Number,
      required: true,
    },
    subBills: [SubBillSchema],
    saleDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    payment: {
      mode: {
        type: String,
        required: true,
        enum: ['Cash', 'Online', 'Wallet', 'Credit', 'Mixed'],
      },
      cashAmount: {
        type: Number,
        default: 0,
      },
      onlineAmount: {
        type: Number,
        default: 0,
      },
      creditAmount: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
      transactionId: {
        type: String,
      },
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
BillSchema.index({ totalBillId: 1, organizationId: 1 });
BillSchema.index({ customerId: 1, organizationId: 1 });
BillSchema.index({ saleDate: -1, organizationId: 1 });
BillSchema.index({ createdAt: -1, organizationId: 1 });

/**
 * Get Bill model for a specific tenant connection
 */
export function getBillModel(connection: Connection): Model<IBill> {
  if (connection.models.Bill) {
    return connection.models.Bill as Model<IBill>;
  }
  return connection.model<IBill>('Bill', BillSchema);
}

export default BillSchema;
