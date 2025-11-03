# Quick Report - New Comprehensive Format

## Overview
The "Today's Quick Report" has been updated to provide a comprehensive daily business summary with detailed breakdowns across multiple categories.

## Report Sections

### 1. TOTAL SALES SUMMARY
Shows overall sales performance for the day.

**Includes:**
- **Total Sale Amount (MRP)**: Sum of all item prices before discounts
- **Total Discount Amount**: All discounts applied (item + bill + promotions)
- **Total Final Amount**: Actual amount after discounts

**Payment Breakdown:**
- Cash
- Online
- Credit

---

### 2. CATEGORY-WISE SALES REPORT
Detailed breakdown of sales by product category.

**For each category shows:**
- **MRP**: Total sale amount at MRP
- **Discount**: Total discounts given
- **Final**: Final amount after discount
- **Cash**: Amount received in cash
- **Online**: Amount received online
- **Credit**: Amount given on credit

**Example:**
| Category | MRP | Discount | Final | Cash | Online | Credit |
|----------|-----|----------|-------|------|--------|--------|
| Whisky | ₹50,000 | ₹2,000 | ₹48,000 | ₹30,000 | ₹10,000 | ₹8,000 |
| Beer | ₹20,000 | ₹500 | ₹19,500 | ₹15,000 | ₹4,500 | ₹0 |

---

### 3. CREDIT GIVEN (Individual Customer-Wise)
Lists all customers who were given credit today.

**Shows:**
- Customer Name
- Credit Amount

**Example:**
| Customer Name | Credit Amount |
|---------------|---------------|
| ABC Traders | ₹15,000 |
| XYZ Store | ₹8,000 |

**Total Credit Given**: Sum of all credit amounts

---

### 4. CREDIT COLLECTED (Individual Customer-Wise)
Lists all customers who paid their outstanding credit today.

**Shows:**
- Customer Name
- Cash (amount paid in cash)
- Online (amount paid online)
- Total (total payment received)

**Example:**
| Customer Name | Cash | Online | Total |
|---------------|------|--------|-------|
| DEF Retailers | ₹5,000 | ₹3,000 | ₹8,000 |
| GHI Shop | ₹0 | ₹10,000 | ₹10,000 |

**Summary**: Total Credit Collected with cash/online breakdown

---

### 5. EXPENSES
All expenses incurred during the day, categorized.

**Shows:**
- Expense Category
- Amount

**Example:**
| Category | Amount |
|----------|--------|
| Rent | ₹10,000 |
| Electricity | ₹2,500 |
| Salaries | ₹15,000 |
| Transportation | ₹1,200 |

**Summary**: Total Expenses with cash/online payment breakdown

---

### 6. VERIFICATION
Final verification section to reconcile all transactions.

**Includes:**
- **Total Sales (Cash + Online + Credit)**: All sales revenue
- **Total Expenses**: All expenses paid
- **Total Credit Collected**: Payments received from customers
- **Net Cash Flow**: Final cash position

**Formula:**
```
Net Cash Flow = (Cash Sales + Online Sales) - Total Expenses + Credit Collected
```

**Highlighted Box**: Shows NET CASH FLOW in green (positive) or red (negative)

---

## Data Sources

### Sales Data
- Source: `Bill` collection
- Date Range: Today 4:00 AM to Tomorrow 3:59:59 AM
- Filters: `organizationId`, `saleDate`

### Credit Given
- Source: `Bill` collection
- Filter: Bills with `payment.creditAmount > 0`
- Groups by: `customerId`, `customerName`

### Credit Collected
- Source: `Payment` collection
- Date Range: Today 4:00 AM to Tomorrow 3:59:59 AM
- Filters: `organizationId`, `paymentDate`, `isReverted: false`
- Groups by: `customerId`, `customerName`

### Expenses
- Source: `Expense` collection
- Date Range: Today 4:00 AM to Tomorrow 3:59:59 AM
- Filters: `organizationId`, `expenseDate`
- Groups by: `categoryName`

---

## API Endpoint

**URL**: `/api/reports/quick-report?date=YYYY-MM-DD`

**Method**: GET

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response**: PDF file download

---

## Usage

### From UI
1. Navigate to Reports page
2. Click "Today's Quick Report" button
3. PDF will download automatically

### Date Range
- The report uses a business day from 4:00 AM to 3:59:59 AM next day
- This ensures late-night sales are included in the correct business day

---

## Calculation Details

### Category-Wise Payment Allocation
Payments are allocated proportionally to categories based on the final amount:

```typescript
const proportion = itemFinalAmount / billTotalAmount;
categoryData.cashAmount += billCashAmount * proportion;
categoryData.onlineAmount += billOnlineAmount * proportion;
categoryData.creditAmount += billCreditAmount * proportion;
```

### Net Cash Flow
```typescript
netCashFlow = (salesCashAmount + salesOnlineAmount) 
            - expensesTotalAmount 
            + creditCollectedTotalAmount
```

**Note**: Credit given is NOT subtracted (it's already excluded from cash/online sales)

---

## Report Layout

### Page Structure
- **Page 1**: 
  - Header with date
  - Total Sales Summary
  - Category-Wise Sales (if fits)
  
- **Page 2** (if needed):
  - Credit Given
  - Credit Collected
  
- **Page 3** (if needed):
  - Expenses
  - Verification
  - Net Cash Flow highlight

### Color Coding
- **Blue** (#2563eb): Sales sections
- **Red** (#dc2626): Credit Given
- **Green** (#16a34a): Credit Collected
- **Purple** (#9333ea): Expenses
- **Black**: Verification
- **Green/Red Box**: Net Cash Flow (positive/negative)

---

## Example Report Summary

```
DAILY QUICK REPORT
Report Date: 03 November, 2025
Period: 03/11/2025, 04:00:00 to 04/11/2025, 03:59:59

1. TOTAL SALES SUMMARY
   Total Sale Amount (MRP):     ₹1,50,000
   Total Discount Amount:       ₹5,000
   Total Final Amount:          ₹1,45,000
   
   Cash:    ₹80,000
   Online:  ₹45,000
   Credit:  ₹20,000

2. CATEGORY-WISE SALES REPORT
   [Table with all categories]

3. CREDIT GIVEN
   Total: ₹20,000 across 5 customers

4. CREDIT COLLECTED
   Total: ₹15,000 (Cash: ₹8,000, Online: ₹7,000)

5. EXPENSES
   Total: ₹28,000 (Cash: ₹18,000, Online: ₹10,000)

6. VERIFICATION
   Total Sales:           ₹1,45,000
   Total Expenses:        ₹28,000
   Credit Collected:      ₹15,000
   
   NET CASH FLOW:         ₹1,32,000
```

---

## Benefits

1. **Complete Financial Picture**: All money in/out in one report
2. **Customer Credit Tracking**: See who owes and who paid
3. **Category Performance**: Identify best-selling categories
4. **Expense Monitoring**: Track daily expenses by category
5. **Cash Reconciliation**: Verify actual cash in hand
6. **Business Day Alignment**: 4 AM cutoff matches liquor store operations

---

## Notes

- All amounts in Indian Rupees (₹)
- Sorted by amount (highest first) for easy analysis
- Automatically generated PDF for easy sharing
- System-generated timestamp for audit trail
- Multi-page support for large data sets
