import mongoose, { Schema, Model, Connection } from 'mongoose';

export interface IExpenseCategory {
  _id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IExpense {
  _id: string;
  expenseNumber: string;
  categoryId: mongoose.Types.ObjectId;
  categoryName: string;
  amount: number;
  description?: string;
  expenseDate: Date;
  paymentMode: 'Cash' | 'Online' | 'Credit' | 'Cheque';
  transactionId?: string;
  receiptUrl?: string;
  notes?: string;
  organizationId: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseCategorySchema = new Schema<IExpenseCategory>(
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

// Unique index for category name per organization
ExpenseCategorySchema.index(
  { name: 1, organizationId: 1 },
  { unique: true }
);

const ExpenseSchema = new Schema<IExpense>(
  {
    expenseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    expenseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'Online', 'Credit', 'Cheque'],
      required: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
ExpenseSchema.index({ expenseNumber: 1 }, { unique: true });
ExpenseSchema.index({ categoryId: 1 });
ExpenseSchema.index({ expenseDate: -1 });
ExpenseSchema.index({ organizationId: 1, expenseDate: -1 });
ExpenseSchema.index({ paymentMode: 1 });

/**
 * Get ExpenseCategory model for a specific tenant connection
 */
export function getExpenseCategoryModel(connection: Connection): Model<IExpenseCategory> {
  if (connection.models.ExpenseCategory) {
    return connection.models.ExpenseCategory as Model<IExpenseCategory>;
  }
  return connection.model<IExpenseCategory>('ExpenseCategory', ExpenseCategorySchema);
}

/**
 * Get Expense model for a specific tenant connection
 */
export function getExpenseModel(connection: Connection): Model<IExpense> {
  if (connection.models.Expense) {
    return connection.models.Expense as Model<IExpense>;
  }
  return connection.model<IExpense>('Expense', ExpenseSchema);
}

export default ExpenseSchema;
export { ExpenseCategorySchema };
