# User Employee Fields Update

## Overview
Added employee-related fields to the User model and implemented password visibility toggle in the user creation form.

## Changes Made

### 1. User Model (`models/User.ts`)
**Added Fields:**
- `isEmployee: boolean` - Indicates if the user is an employee (default: false)
- `salary?: number` - Monthly salary for employees (optional, min: 0)

**Schema Updates:**
```typescript
export interface IUser {
  // ... existing fields
  isEmployee: boolean;
  salary?: number;
  // ... rest of fields
}

const UserSchema = new Schema<IUser>({
  // ... existing fields
  isEmployee: {
    type: Boolean,
    default: false,
  },
  salary: {
    type: Number,
    min: 0,
  },
  // ... rest of fields
});
```

### 2. API Endpoints

#### Create User API (`app/api/users/route.ts`)
**Updated Schema:**
```typescript
const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer']),
  isEmployee: z.boolean().optional(),
  salary: z.number().min(0).optional(),
});
```

**Logic:**
- Accepts `isEmployee` and `salary` in request body
- Creates user in both tenant and main databases with employee fields
- Salary is only saved if `isEmployee` is true

#### Update User API (`app/api/users/[id]/route.ts`)
**Updated Schema:**
```typescript
const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['org_admin', 'admin', 'manager', 'sales', 'accountant', 'tax_officer']).optional(),
  isEmployee: z.boolean().optional(),
  salary: z.number().min(0).optional(),
});
```

**Logic:**
- Accepts `isEmployee` and `salary` updates
- If `isEmployee` is set to false, salary is cleared
- Updates both tenant and main databases

### 3. Frontend (`app/dashboard/management/users/page.tsx`)

#### Interface Update
```typescript
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'org_admin' | 'admin' | 'manager' | 'sales' | 'accountant' | 'tax_officer';
  isActive: boolean;
  isEmployee: boolean;
  salary?: number;
  createdAt: string;
}
```

#### Form State
```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  role: 'sales' as User['role'],
  isEmployee: false,
  salary: '',
});
const [showPassword, setShowPassword] = useState(false);
```

#### Password Visibility Toggle
- Added eye icon button to toggle password visibility
- Shows/hides password text in real-time
- Icon changes based on visibility state (eye vs eye-slash)

#### Employee Fields
- **Checkbox:** "Is Employee" - toggles employee status
- **Salary Input:** Appears only when "Is Employee" is checked
  - Type: number
  - Min: 0
  - Step: 0.01
  - Required when employee checkbox is checked
  - Placeholder: "Enter monthly salary"
  - Currency symbol: ₹ (Indian Rupee)

#### User Card Display
- Shows employee badge when `isEmployee` is true
- Displays salary in Indian format with locale formatting
- Blue-themed badge with emoji indicator (👤 Employee)
- Format: `₹{salary.toLocaleString('en-IN')}/mo`

## UI Features

### Create User Modal
1. **Name Field** - Text input (required)
2. **Email Field** - Email input (required)
3. **Password Field** - Password input with visibility toggle (required)
   - Eye icon button on the right
   - Toggles between password and text type
4. **Role Dropdown** - Select role (required)
   - Sales, Accountant, Tax Officer, Manager, Admin
5. **Is Employee Checkbox** - Toggle employee status
6. **Salary Field** - Number input (conditional, required if employee)
   - Only visible when "Is Employee" is checked
   - Formatted with ₹ symbol
   - Supports decimal values

### User Cards
- Display all user information in card format
- Role badge with color coding
- Active/Inactive status badge
- **Employee Info Section** (conditional):
  - Blue-themed badge
  - Shows "👤 Employee" label
  - Displays monthly salary in Indian format
  - Only visible for employees with salary

## Validation

### Backend Validation
- `isEmployee`: Optional boolean
- `salary`: Optional number, minimum 0
- Salary is only saved if `isEmployee` is true
- When updating, setting `isEmployee` to false clears salary

### Frontend Validation
- Password: Minimum 8 characters (enforced by backend)
- Salary: Required when "Is Employee" is checked
- Salary: Must be >= 0
- Form submission includes proper type conversion (parseFloat for salary)

## API Request/Response

### Create User Request
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "role": "sales",
  "isEmployee": true,
  "salary": 50000
}
```

### User Response
```json
{
  "_id": "...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "sales",
  "isActive": true,
  "isEmployee": true,
  "salary": 50000,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## Database Schema

### MongoDB Document
```javascript
{
  _id: ObjectId("..."),
  name: "John Doe",
  email: "john@example.com",
  password: "hashed_password",
  role: "sales",
  organizationId: "org_123",
  isActive: true,
  isEmployee: true,
  salary: 50000,
  createdAt: ISODate("2024-01-01T00:00:00.000Z"),
  updatedAt: ISODate("2024-01-01T00:00:00.000Z")
}
```

## Usage Examples

### Creating an Employee User
1. Click "Add New User" button
2. Fill in name and email
3. Enter password (use eye icon to verify)
4. Select role
5. Check "Is Employee" checkbox
6. Enter monthly salary (e.g., 50000)
7. Click "Create User"

### Creating a Non-Employee User
1. Click "Add New User" button
2. Fill in name and email
3. Enter password
4. Select role
5. Leave "Is Employee" unchecked
6. Click "Create User"

### Viewing Employee Information
- Employee users display a blue badge in their card
- Badge shows "👤 Employee" label
- Salary is displayed in Indian format: ₹50,000/mo
- Non-employee users don't show this badge

## Security Considerations

1. **Password Visibility:**
   - Toggle is client-side only
   - Password is still sent securely to backend
   - Hashed before storage in database

2. **Salary Information:**
   - Only visible to org_admin users
   - Stored as plain number in database
   - Can be encrypted if needed in future

3. **Access Control:**
   - Only org_admin can create/update/delete users
   - Employee fields follow same access control

## Testing Checklist

- [ ] Create user with isEmployee = true and salary
- [ ] Create user with isEmployee = false (no salary)
- [ ] Toggle password visibility works correctly
- [ ] Salary field appears/disappears based on checkbox
- [ ] Salary validation (required when employee, min 0)
- [ ] Employee badge displays correctly on user cards
- [ ] Salary formatting displays correctly (Indian format)
- [ ] Update user to change employee status
- [ ] Update user to change salary
- [ ] Setting isEmployee to false clears salary
- [ ] Both tenant and main databases updated correctly

## Future Enhancements

1. **Salary History:**
   - Track salary changes over time
   - Display salary revision history

2. **Employee Details:**
   - Add more employee-specific fields
   - Employee ID, joining date, department, etc.

3. **Payroll Integration:**
   - Link to payroll system
   - Generate salary slips

4. **Salary Encryption:**
   - Encrypt salary data at rest
   - Decrypt only when needed

5. **Bulk Import:**
   - Import employees from Excel
   - Include salary information

## Files Modified

1. `models/User.ts` - Added isEmployee and salary fields
2. `app/api/users/route.ts` - Updated create user API
3. `app/api/users/[id]/route.ts` - Updated update user API
4. `app/dashboard/management/users/page.tsx` - Updated UI with new fields and password toggle

## Backward Compatibility

- Existing users without `isEmployee` field will default to `false`
- Existing users without `salary` field will have `undefined` value
- No migration needed - fields are optional
- UI gracefully handles missing employee data
