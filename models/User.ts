import mongoose, { Schema, Model, Connection } from 'mongoose';

export type UserRole = 'org_admin' | 'admin' | 'manager' | 'sales' | 'accountant' | 'tax_officer';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  organizationId: string;
  isActive: boolean;
  lastLogin?: Date;
  refreshToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
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
    password: {
      type: String,
      required: true,
      select: false, // Don't return password in queries by default
    },
    role: {
      type: String,
      enum: ['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer'],
      default: 'sales',
      required: true,
    },
    organizationId: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ organizationId: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

/**
 * Get User model for main database (stores all users across organizations)
 * Users are stored in main DB with organizationId reference
 */
const User: Model<IUser> = 
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

/**
 * Helper to get users by organization
 */
export async function getUsersByOrganization(organizationId: string): Promise<IUser[]> {
  return User.find({ organizationId, isActive: true }).select('-password -refreshToken');
}

/**
 * Helper to get admin users for an organization
 */
export async function getOrganizationAdmins(organizationId: string): Promise<IUser[]> {
  return User.find({ 
    organizationId, 
    role: { $in: ['org_admin', 'admin'] }, 
    isActive: true 
  }).select('email name');
}
