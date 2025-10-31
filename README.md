# Liquor POS - Multi-Tenant System

A modern, multi-tenant Point of Sale (POS) system built with Next.js 14, TypeScript, Tailwind CSS, and MongoDB. Designed specifically for liquor stores with support for multiple independent tenants.

## 🚀 Features

- **Multi-Tenant Architecture**: Complete data isolation per tenant using separate MongoDB databases
- **Authentication System**: JWT-based auth with access/refresh tokens, email verification, and role-based access control
- **Organization Management**: Signup with email verification, admin approval for password resets
- **User Management**: Role-based permissions (Admin, Manager, Staff) with full CRUD operations
- **Modern Tech Stack**: Next.js 14 with App Router, TypeScript, and Tailwind CSS
- **MongoDB Integration**: Mongoose ODM with multi-tenant connection management
- **Email Notifications**: Automated emails for verification, password resets, and welcome messages
- **System Caching**: In-memory caching for improved performance
- **RESTful API**: Comprehensive API routes for products, sales, and user management
- **Type Safety**: Full TypeScript support throughout the application
- **Responsive Design**: Beautiful, modern UI built with Tailwind CSS
- **Security**: Password strength validation, email normalization, token-based authentication

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn** or **pnpm**
- **MongoDB** (local installation or MongoDB Atlas account)

## 🛠️ Installation

1. **Clone or navigate to the project directory**

```bash
cd FinalLiqourPOS
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/liquor-pos
NODE_ENV=development

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com

# Application URLs
APP_URL=http://localhost:3000
```

For MongoDB Atlas, use:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/liquor-pos
```

**Important:** 
- Generate strong, unique secrets for JWT_SECRET and JWT_REFRESH_SECRET in production
- For Gmail SMTP, use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
FinalLiqourPOS/
├── app/                           # Next.js App Router
│   ├── api/                       # API Routes
│   │   ├── auth/                  # Authentication endpoints
│   │   │   ├── signup/           # Organization signup
│   │   │   ├── login/            # User login
│   │   │   ├── refresh/          # Token refresh
│   │   │   ├── forgot-password/  # Password reset request
│   │   │   ├── reset-password/   # Password reset
│   │   │   └── verify-organization/ # Email verification
│   │   ├── users/                 # User management
│   │   ├── health/                # Health check endpoint
│   │   ├── products/              # Product CRUD operations
│   │   ├── sales/                 # Sales management
│   │   └── tenants/               # Tenant management
│   ├── dashboard/                 # Protected dashboard pages
│   │   ├── users/                 # User management UI
│   │   └── page.tsx               # Dashboard home
│   ├── login/                     # Login page
│   ├── signup/                    # Organization signup page
│   ├── verify-organization/       # Email verification page
│   ├── reset-password/            # Password reset page
│   ├── globals.css                # Global styles
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
├── lib/                           # Utility libraries
│   ├── auth.ts                    # JWT and password utilities
│   ├── auth-middleware.ts         # Authentication middleware
│   ├── cache.ts                   # System caching
│   ├── email.ts                   # Email service
│   ├── mongodb.ts                 # MongoDB client connection
│   ├── mongoose.ts                # Mongoose multi-tenant setup
│   └── tenant-context.ts          # Tenant identification logic
├── models/                        # Mongoose models
│   ├── Organization.ts            # Organization model (main DB)
│   ├── User.ts                    # User model (main DB)
│   ├── Product.ts                 # Product model (tenant-specific)
│   └── Sale.ts                    # Sale model (tenant-specific)
├── middleware.ts                  # Next.js middleware for tenant routing
├── AUTHENTICATION.md              # Authentication documentation
├── .env.example                   # Environment variables template
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript configuration
└── tailwind.config.ts             # Tailwind CSS configuration
```

## 🔐 Multi-Tenant Architecture

### How It Works

1. **Tenant Identification**: The system identifies tenants through:
   - `X-Tenant-ID` header (for API calls)
   - Subdomain extraction (e.g., `tenant1.yourdomain.com`)
   - Default tenant for development

2. **Database Isolation**: Each tenant gets their own MongoDB database:
   - Main database: `liquor_pos_main` (stores tenant registry)
   - Tenant databases: `tenant_<tenantId>` (stores tenant-specific data)

3. **Middleware**: Automatically extracts and validates tenant ID from requests

### Creating a New Tenant

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Store Name",
    "subdomain": "store1",
    "settings": {
      "currency": "USD",
      "timezone": "America/New_York",
      "taxRate": 8.5
    }
  }'
```

## 🔐 Authentication System

The application includes a comprehensive authentication system with:

### Features
- **Organization Signup**: Email verification required before activation
- **JWT Authentication**: Access tokens (15min) and refresh tokens (7 days)
- **Role-Based Access**: Admin, Manager, and Staff roles with different permissions
- **Password Reset**: Admin approval required via email
- **Email Normalization**: All emails automatically converted to lowercase
- **System Caching**: Performance optimization with in-memory caching

### Quick Start

1. **Sign Up**: Visit `/signup` to create a new organization
2. **Verify Email**: Check your email and click the verification link
3. **Login**: Visit `/login` with your credentials
4. **Access Dashboard**: Navigate to `/dashboard` after login
5. **Manage Users**: Admins/Managers can access `/dashboard/users`

### User Roles

- **Admin**: Full access, can manage all users including other admins
- **Manager**: Can manage staff users, access all business features
- **Staff**: Basic access to business features

For detailed authentication documentation, see [AUTHENTICATION.md](./AUTHENTICATION.md)

## 📡 API Endpoints

### Authentication
- `POST /api/auth/signup` - Create organization (sends verification email)
- `POST /api/auth/verify-organization` - Verify email token
- `POST /api/auth/login` - User login (returns JWT tokens)
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset (sends to admins)
- `POST /api/auth/reset-password` - Reset password with token

### User Management (Protected)
- `GET /api/users` - List organization users (Admin/Manager)
- `POST /api/users` - Create new user (Admin/Manager)
- `GET /api/users/[id]` - Get user by ID (Admin/Manager)
- `PUT /api/users/[id]` - Update user (Admin/Manager)
- `DELETE /api/users/[id]` - Soft delete user (Admin/Manager)

### Health Check
- `GET /api/health` - Check system and database health

### Tenants
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create a new tenant

### Products (Tenant-Specific)
- `GET /api/products` - List all products
- `POST /api/products` - Create a new product
- `GET /api/products/[id]` - Get product by ID
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Soft delete product

### Sales (Tenant-Specific)
- `GET /api/sales` - List sales with pagination
- `POST /api/sales` - Create a new sale

### Example: Create a Product

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{
    "name": "Premium Whiskey",
    "sku": "WHIS-001",
    "category": "Whiskey",
    "price": 49.99,
    "cost": 30.00,
    "stockQuantity": 100,
    "alcoholContent": 40,
    "volume": 750,
    "volumeUnit": "ml"
  }'
```

### Example: Create a Sale

```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default" \
  -d '{
    "items": [
      {
        "productId": "product_id_here",
        "productName": "Premium Whiskey",
        "quantity": 2,
        "unitPrice": 49.99,
        "subtotal": 99.98
      }
    ],
    "subtotal": 99.98,
    "tax": 8.50,
    "discount": 0,
    "total": 108.48,
    "paymentMethod": "card",
    "customerName": "John Doe"
  }'
```

## 🗄️ Data Models

### Product
- Name, SKU, Barcode
- Category, Price, Cost
- Stock quantity and minimum levels
- Alcohol content and volume
- Active/inactive status

### Sale
- Auto-generated sale number
- Line items with product details
- Subtotal, tax, discount, total
- Payment method and status
- Customer information
- Timestamps

### Tenant
- Name, subdomain, domain
- Active status
- Custom settings (currency, timezone, tax rate)
- Timestamps

## 🚀 Deployment

### Build for Production

```bash
npm run build
npm start
```

### Environment Variables for Production

Ensure these are set in your production environment:

```env
MONGODB_URI=your_production_mongodb_uri
NODE_ENV=production
```

## 🧪 Testing the API

You can test the API using the health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## 🔧 Development Tips

1. **Default Tenant**: In development, requests without a tenant ID use the default tenant (`default`)

2. **Subdomain Testing**: To test subdomain routing locally, add entries to your hosts file:
   ```
   127.0.0.1 tenant1.localhost
   127.0.0.1 tenant2.localhost
   ```

3. **Database Inspection**: Use MongoDB Compass or mongosh to inspect tenant databases:
   ```bash
   mongosh
   show dbs
   use tenant_default
   show collections
   ```

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contact the repository owner for contribution guidelines.

## 📧 Support

For support, please contact the development team.
#   L i q o u r P O S P r o d  
 