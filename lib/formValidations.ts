export type FieldValidator = (
  value: unknown,
  formData: Record<string, any>
) => string | null;

export interface DynamicFieldConfig {
  placeholder: string;
  validators?: FieldValidator[];
}

export type FormKey =
  | 'product'
  | 'vendor'
  | 'user'
  | 'login'
  | 'signup'
  | 'purchaseItem';

type FormConfigMap = Record<FormKey, Record<string, DynamicFieldConfig>>;

const requiredText = (label: string): FieldValidator => (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return `${label} is required`;
  }
  return null;
};

const nonNegativeNumber = (label: string, allowZero = true): FieldValidator => (value) => {
  if (value === '' || value === null || value === undefined) {
    return `${label} is required`;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return `${label} must be a valid number`;
  }

  if (!allowZero && numericValue <= 0) {
    return `${label} must be greater than zero`;
  }

  if (numericValue < 0) {
    return `${label} cannot be negative`;
  }

  return null;
};

const optionalNonNegativeNumber = (label: string, allowZero = true): FieldValidator => (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numericValue)) {
    return `${label} must be a valid number`;
  }

  if (!allowZero && numericValue <= 0) {
    return `${label} must be greater than zero`;
  }

  if (numericValue < 0) {
    return `${label} cannot be negative`;
  }

  return null;
};

const emailValidator: FieldValidator = (value) => {
  if (!value || typeof value !== 'string') {
    return 'Email is required';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return 'Email is required';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return 'Enter a valid email address';
  }

  return null;
};

const passwordValidator: FieldValidator = (value) => {
  if (!value || typeof value !== 'string') {
    return 'Password is required';
  }

  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }

  return null;
};

const confirmPasswordValidator: FieldValidator = (value, formData) => {
  if (!value || typeof value !== 'string') {
    return 'Confirm password is required';
  }

  if (value !== formData.password) {
    return 'Passwords do not match';
  }

  return null;
};

const contactNumberValidator = (
  label: string,
  options: { required?: boolean; minDigits?: number } = {}
): FieldValidator => (value) => {
  const { required = true, minDigits = 8 } = options;

  if (!value || typeof value !== 'string' || value.trim() === '') {
    return required ? `${label} is required` : null;
  }

  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length < minDigits) {
    return `${label} must include at least ${minDigits} digits`;
  }

  return null;
};

const formConfig: FormConfigMap = {
  product: {
    name: {
      placeholder: 'e.g. Royal Stag Deluxe Whisky',
      validators: [requiredText('Product name')],
    },
    brand: {
      placeholder: 'e.g. Seagram',
    },
    category: {
      placeholder: 'Select category',
      validators: [requiredText('Category')],
    },
    sku: {
      placeholder: 'Optional SKU / Barcode',
    },
    pricePerUnit: {
      placeholder: 'MRP per bottle in ₹',
      validators: [nonNegativeNumber('Price per unit', false)],
    },
    volumeML: {
      placeholder: 'Select bottle volume in ML',
      validators: [nonNegativeNumber('Volume (ML)', false)],
    },
    currentStock: {
      placeholder: 'Opening stock (bottles)',
      validators: [nonNegativeNumber('Current stock')],
    },
    reorderLevel: {
      placeholder: 'Alert level (bottles)',
      validators: [optionalNonNegativeNumber('Reorder level')],
    },
    bottlesPerCaret: {
      placeholder: 'Bottles in one caret',
      validators: [optionalNonNegativeNumber('Bottles per caret', false)],
    },
    purchasePricePerCaret: {
      placeholder: 'Latest purchase price per caret in ₹',
      validators: [optionalNonNegativeNumber('Purchase price per caret', false)],
    },
  },
  vendor: {
    name: {
      placeholder: 'e.g. Sunrise Beverages Pvt Ltd',
      validators: [requiredText('Vendor name')],
    },
    tin: {
      placeholder: 'Taxpayer Identification Number',
      validators: [requiredText('TIN')],
    },
    cin: {
      placeholder: 'Corporate Identification Number',
      validators: [requiredText('CIN')],
    },
    priority: {
      placeholder: 'Priority order (1 is highest)',
      validators: [nonNegativeNumber('Priority', false)],
    },
    gstin: {
      placeholder: '15-digit GSTIN',
    },
    contactPerson: {
      placeholder: 'Primary contact person',
    },
    email: {
      placeholder: 'contact@vendor.com',
      validators: [emailValidator],
    },
    phone: {
      placeholder: '+91 9876543210',
      validators: [contactNumberValidator('Phone number')],
    },
    address: {
      placeholder: 'Registered address',
      validators: [requiredText('Address')],
    },
    city: {
      placeholder: 'City name',
    },
    state: {
      placeholder: 'State / Region',
    },
    pincode: {
      placeholder: 'Area pincode',
    },
    accountName: {
      placeholder: 'Bank account holder name',
      validators: [requiredText('Account name')],
    },
    accountNumber: {
      placeholder: 'Bank account number',
      validators: [requiredText('Account number')],
    },
    ifscCode: {
      placeholder: 'Bank IFSC code',
      validators: [requiredText('IFSC code')],
    },
    bankName: {
      placeholder: 'Bank name',
      validators: [requiredText('Bank name')],
    },
    branchName: {
      placeholder: 'Branch name',
    },
  },
  user: {
    name: {
      placeholder: 'e.g. Rohan Mehta',
      validators: [requiredText('Name')],
    },
    email: {
      placeholder: 'user@company.com',
      validators: [emailValidator],
    },
    password: {
      placeholder: 'Minimum 8 characters',
      validators: [passwordValidator],
    },
    role: {
      placeholder: 'Select user role',
      validators: [requiredText('Role')],
    },
    salary: {
      placeholder: 'Monthly salary in ₹',
      validators: [optionalNonNegativeNumber('Salary')],
    },
  },
  login: {
    email: {
      placeholder: 'you@example.com',
      validators: [emailValidator],
    },
    password: {
      placeholder: 'Enter your password',
      validators: [requiredText('Password')],
    },
  },
  signup: {
    organizationName: {
      placeholder: 'My Liquor Store',
      validators: [requiredText('Organization name')],
    },
    email: {
      placeholder: 'admin@example.com',
      validators: [emailValidator],
    },
    phone: {
      placeholder: '+91 9876543210',
      validators: [contactNumberValidator('Phone number')],
    },
    address: {
      placeholder: 'Street address',
    },
    city: {
      placeholder: 'City',
    },
    state: {
      placeholder: 'State',
    },
    pincode: {
      placeholder: 'Pincode',
    },
    gstNumber: {
      placeholder: '22AAAAA0000A1Z5',
    },
    licenseNumber: {
      placeholder: 'License number',
    },
    fssaiNumber: {
      placeholder: '14 digit FSSAI number',
    },
    panNumber: {
      placeholder: 'ABCDE1234F',
    },
    website: {
      placeholder: 'https://www.example.com',
    },
    adminName: {
      placeholder: 'Admin full name',
      validators: [requiredText('Admin name')],
    },
    password: {
      placeholder: 'At least 8 characters',
      validators: [passwordValidator],
    },
    confirmPassword: {
      placeholder: 'Retype password',
      validators: [confirmPasswordValidator],
    },
    subdomain: {
      placeholder: 'mystore',
    },
  },
  purchaseItem: {
    vendorId: {
      placeholder: 'Choose vendor',
      validators: [requiredText('Vendor')],
    },
    productId: {
      placeholder: 'Choose product',
      validators: [requiredText('Product')],
    },
    carets: {
      placeholder: 'Number of carets',
      validators: [nonNegativeNumber('Carets')],
    },
    pieces: {
      placeholder: 'Loose bottles',
      validators: [nonNegativeNumber('Pieces')],
    },
    invoiceNumber: {
      placeholder: 'Invoice number',
      validators: [requiredText('Invoice number')],
    },
    pricePerCaret: {
      placeholder: 'Price per caret in ₹',
      validators: [nonNegativeNumber('Price per caret', false)],
    },
  },
};

export const getFieldConfig = (
  formKey: FormKey,
  field: string
): DynamicFieldConfig | undefined => {
  return formConfig[formKey]?.[field];
};

export const getPlaceholder = (formKey: FormKey, field: string): string | undefined => {
  return getFieldConfig(formKey, field)?.placeholder;
};

export const validateField = (
  formKey: FormKey,
  field: string,
  value: unknown,
  formData: Record<string, any>
): string | null => {
  const config = getFieldConfig(formKey, field);
  if (!config?.validators || config.validators.length === 0) {
    return null;
  }

  for (const validator of config.validators) {
    const error = validator(value, formData);
    if (error) {
      return error;
    }
  }

  return null;
};

export const validateForm = (
  formKey: FormKey,
  formData: Record<string, any>
): Record<string, string> => {
  const config = formConfig[formKey];
  if (!config) {
    return {};
  }

  const errors: Record<string, string> = {};

  Object.entries(config).forEach(([field, fieldConfig]) => {
    if (!fieldConfig.validators) return;
    const error = validateField(formKey, field, formData[field], formData);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

export const hasErrors = (errors: Record<string, string>): boolean =>
  Object.keys(errors).length > 0;

