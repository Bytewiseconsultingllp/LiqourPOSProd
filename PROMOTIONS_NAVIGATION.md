# Promotions Navigation - Added to Management Center

## Access Points

### 1. Management Center (Primary)
**Path:** `/dashboard/management` → **Promotions & Offers** card

The Promotions & Offers management has been added as a card in the Management Center with:
- **Icon:** Tag/Label icon (orange gradient)
- **Title:** Promotions & Offers
- **Description:** Manage promotional campaigns and discounts
- **Color:** Orange gradient (from-orange-500 to-orange-600)
- **Permissions:** org_admin, admin, manager
- **Link:** `/promotions`

### 2. Direct Access
**Path:** `/promotions`

You can also access the promotions page directly via this URL.

## Management Center Layout

The Management Center now includes these cards:

1. **User Management** (Blue)
   - Manage team members, roles, and permissions
   - Permissions: org_admin, admin, manager

2. **Product Management** (Green)
   - Manage inventory, products, and pricing
   - Permissions: org_admin, admin, manager, sales, accountant, tax_officer

3. **Vendor Management** (Purple)
   - Manage vendors and their details
   - Permissions: org_admin, admin, manager, sales, accountant, tax_officer

4. **Customer Management** (Pink)
   - Manage customers and their accounts
   - Permissions: org_admin, admin, manager, sales

5. **Promotions & Offers** (Orange) ✨ NEW
   - Manage promotional campaigns and discounts
   - Permissions: org_admin, admin, manager

## User Flow

```
Dashboard
    ↓
Management Center
    ↓
Promotions & Offers Card (Click)
    ↓
Promotions Management Page
    ↓
Create/Edit/Delete Promotions
```

## Role-Based Access

### Can Access Promotions:
- ✅ Organization Admin (org_admin)
- ✅ Admin (admin)
- ✅ Manager (manager)

### Cannot Access Promotions:
- ❌ Sales (sales)
- ❌ Accountant (accountant)
- ❌ Tax Officer (tax_officer)

## Visual Design

The Promotions card features:
- **Gradient Background:** Orange (500 to 600)
- **Hover Effect:** Shadow elevation and opacity change
- **Icon:** SVG tag/label icon
- **Responsive:** Works on mobile, tablet, and desktop
- **Touch-Friendly:** Active scale animation on click

## Testing Access

1. **Login** as admin/manager/org_admin
2. Navigate to **Dashboard**
3. Click **Management Center**
4. Find the **Promotions & Offers** card (orange, with tag icon)
5. Click to access the promotions management page

## Next Steps

The promotions system is now fully integrated:
- ✅ Database model created
- ✅ API endpoints functional
- ✅ Management UI complete
- ✅ Sales page integration done
- ✅ Added to Management Center navigation

You can now start creating and managing promotions through the Management Center!
