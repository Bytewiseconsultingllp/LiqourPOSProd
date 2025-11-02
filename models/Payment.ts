import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IPayment {
  _id: string;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  cashAmount: number;
  onlineAmount: number;
  totalAmount: number;
  paymentDate: Date;
  organizationId: string;
  createdBy: mongoose.Types.ObjectId;
  isReverted: boolean;
  revertedAt?: Date;
  revertedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    cashAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    onlineAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isReverted: {
      type: Boolean,
      default: false,
    },
    revertedAt: {
      type: Date,
    },
    revertedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
PaymentSchema.index({ customerId: 1, organizationId: 1 });
PaymentSchema.index({ paymentDate: -1, organizationId: 1 });
PaymentSchema.index({ isReverted: 1 });

export function getPaymentModel(connection: Connection): Model<IPayment> {
  if (connection.models.Payment) {
    return connection.models.Payment as Model<IPayment>;
  }
  return connection.model<IPayment>('Payment', PaymentSchema);
}

export default PaymentSchema;
