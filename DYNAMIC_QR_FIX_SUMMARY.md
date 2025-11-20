# Dynamic QR Code Based on Payment Mode - Fix Summary

## Issue Fixed

**Problem:** QR code was being generated for the total bill amount regardless of payment mode. This was incorrect because:
- Cash payments don't need QR codes
- Credit payments don't need QR codes
- QR should only be generated for online payment amounts

**Requirement:** Generate QR code dynamically based on payment mode:
1. **Complete Cash** → Show message: "Please pay cash: ₹X"
2. **Complete Credit** → Show message: "Please clear your dues on time. Credit amount: ₹X"
3. **Complete/Partial Online** → Generate QR for online amount only + show other payment modes
4. **Cash + Credit (no online)** → Show both amounts with instructions

---

## Solution Implemented

### Payment Mode Logic

The system now checks the payment breakdown and responds accordingly:

```typescript
const cashAmount = payment.cashAmount || 0;
const onlineAmount = payment.onlineAmount || 0;
const creditAmount = payment.creditAmount || 0;
```

#### Case 1: Complete Cash Payment
```
Payment: Cash = ₹1000, Online = ₹0, Credit = ₹0
Display: "Please pay cash: ₹1000"
QR Code: None
```

#### Case 2: Complete Credit Payment
```
Payment: Cash = ₹0, Online = ₹0, Credit = ₹1000
Display: "Please clear your dues on time. Credit amount: ₹1000"
QR Code: None
```

#### Case 3: Online Payment (Complete or Partial)
```
Scenario A - Complete Online:
Payment: Cash = ₹0, Online = ₹1000, Credit = ₹0
Display: "Scan to pay online: ₹1000"
QR Code: Generated for ₹1000

Scenario B - Partial Online:
Payment: Cash = ₹300, Online = ₹500, Credit = ₹200
Display: 
  "Scan to pay online: ₹500
   Cash: ₹300
   Credit: ₹200 (Please clear on time)"
QR Code: Generated for ₹500 only
```

#### Case 4: Cash + Credit (No Online)
```
Payment: Cash = ₹600, Online = ₹0, Credit = ₹400
Display: 
  "Cash: ₹600
   Credit: ₹400 (Please clear on time)"
QR Code: None
```

---

## Files Modified

### 1. `components/SubBillsViewer.tsx`
**Changes:**
- Added `paymentMessage` state variable
- Completely rewrote QR generation logic with payment mode detection
- QR code now generated only when `onlineAmount > 0`
- QR amount is `onlineAmount` not `totalAmount`
- Added logic to build appropriate payment messages
- Pass `paymentMessage` to both ThermalBillPrint and BatchPrintSubBills

**Key Logic:**
```typescript
// Generate QR only for online amount
if (onlineAmount > 0) {
  const upiString = `upi://pay?pa=paytmqr5itz52@ptys&am=${onlineAmount.toFixed(2)}&tn=Invoice-${billNumber}`;
  const dataUrl = await QRCode.toDataURL(upiString);
  setQrCodeDataUrl(dataUrl);
  
  // Build message showing all payment modes
  let message = `Scan to pay online: ₹${onlineAmount.toFixed(2)}`;
  if (cashAmount > 0) {
    message += `\nCash: ₹${cashAmount.toFixed(2)}`;
  }
  if (creditAmount > 0) {
    message += `\nCredit: ₹${creditAmount.toFixed(2)} (Please clear on time)`;
  }
  setPaymentMessage(message);
}
```

---

### 2. `components/ThermalBillPrint.tsx`
**Changes:**
- Added `paymentMessage` prop to interface
- Updated component to receive `paymentMessage`
- Updated QR/message display section to show both QR and message
- Message uses `white-space: pre-line` to support multi-line text
- Message is bold when no QR code (pure cash/credit), normal when with QR

**Display Logic:**
```tsx
{(qrSrc || paymentMessage) && (
  <div>
    {qrSrc && (
      <img src={qrSrc} alt="Payment QR Code" />
      <div>Scan to Pay</div>
    )}
    {paymentMessage && (
      <div style={{ 
        whiteSpace: 'pre-line',  // Support \n line breaks
        fontWeight: qrSrc ? 'normal' : 'bold'
      }}>
        {paymentMessage}
      </div>
    )}
  </div>
)}
```

---

### 3. `components/BatchPrintSubBills.tsx`
**Changes:**
- Added `paymentMessage` prop to interface
- Updated component to receive `paymentMessage`
- Updated QR display section to show payment message
- Same display logic as ThermalBillPrint

---

## Technical Details

### UPI String Format
```
upi://pay?pa=paytmqr5itz52@ptys&am={ONLINE_AMOUNT}&tn=Invoice-{BILL_NUMBER}
```

**Components:**
- `pa` = UPI ID (paytmqr5itz52@ptys)
- `am` = Amount (only online amount, not total)
- `tn` = Transaction note (includes bill number for tracking)

### Payment Amount Precision
All amounts use `.toFixed(2)` to ensure proper decimal formatting:
```typescript
onlineAmount.toFixed(2)  // ₹1000.00 or ₹1234.56
```

### Multi-line Message Support
Messages use `\n` for line breaks and `white-space: pre-line` CSS:
```typescript
message += `\nCash: ₹${cashAmount.toFixed(2)}`;
// Renders as:
// Scan to pay online: ₹500
// Cash: ₹300
// Credit: ₹200 (Please clear on time)
```

---

## Examples

### Example 1: Restaurant Bill - Split Payment
**Bill Details:**
- Total: ₹1500
- Cash: ₹500
- Online: ₹1000
- Credit: ₹0

**Output:**
```
[QR Code for ₹1000]
Scan to Pay

Scan to pay online: ₹1000.00
Cash: ₹500.00
```

---

### Example 2: Liquor Store - Complete Credit
**Bill Details:**
- Total: ₹2500
- Cash: ₹0
- Online: ₹0
- Credit: ₹2500

**Output:**
```
Please clear your dues on time. Credit amount: ₹2500.00
```
*(No QR code shown)*

---

### Example 3: Bar - Cash Only
**Bill Details:**
- Total: ₹800
- Cash: ₹800
- Online: ₹0
- Credit: ₹0

**Output:**
```
Please pay cash: ₹800.00
```
*(No QR code shown)*

---

### Example 4: Wholesale Order - Complex Split
**Bill Details:**
- Total: ₹10000
- Cash: ₹3000
- Online: ₹4000
- Credit: ₹3000

**Output:**
```
[QR Code for ₹4000]
Scan to Pay

Scan to pay online: ₹4000.00
Cash: ₹3000.00
Credit: ₹3000.00 (Please clear on time)
```

---

## Testing Checklist

### Cash Payment
- [ ] Create bill with 100% cash payment
- [ ] Print sub-bill
- [ ] Verify message: "Please pay cash: ₹X"
- [ ] Verify no QR code displayed

### Credit Payment
- [ ] Create bill with 100% credit payment
- [ ] Print sub-bill
- [ ] Verify message: "Please clear your dues on time. Credit amount: ₹X"
- [ ] Verify no QR code displayed

### Online Payment Only
- [ ] Create bill with 100% online payment
- [ ] Print sub-bill
- [ ] Verify QR code appears
- [ ] Scan QR and verify amount matches online amount
- [ ] Verify message: "Scan to pay online: ₹X"

### Mixed Payment (Online + Cash)
- [ ] Create bill with online + cash
- [ ] Print sub-bill
- [ ] Verify QR code for online amount only
- [ ] Scan QR and verify amount is online portion
- [ ] Verify message shows both amounts

### Mixed Payment (Online + Credit)
- [ ] Create bill with online + credit
- [ ] Print sub-bill
- [ ] Verify QR code for online amount
- [ ] Verify message shows credit reminder

### Mixed Payment (Cash + Credit, no online)
- [ ] Create bill with cash + credit
- [ ] Print sub-bill
- [ ] Verify no QR code
- [ ] Verify message shows both amounts

### Batch Print
- [ ] Test batch print with various payment modes
- [ ] Verify each sub-bill shows correct QR/message
- [ ] Verify different payment modes handled correctly

---

## Benefits

### 1. Accurate Payment Collection
- ✅ Customers scan only the exact online amount
- ✅ No confusion about how much to pay via UPI
- ✅ Cash and credit amounts clearly stated

### 2. Improved User Experience
- ✅ Clear instructions for each payment mode
- ✅ No unnecessary QR codes for cash/credit payments
- ✅ Multi-line messages easy to read

### 3. Reduced Payment Errors
- ✅ Customers can't accidentally pay wrong amount
- ✅ QR amount matches expected online payment
- ✅ Clear reminders for credit payments

### 4. Professional Appearance
- ✅ Clean, context-aware bills
- ✅ Only relevant information displayed
- ✅ Better customer communication

---

## Migration Notes

**No data migration required** - This is purely a display/UX change.

**Backward compatible** - Works with all existing bills.

**Immediate effect** - All new prints will use the new logic.

---

## Configuration

### UPI ID Configuration
Currently hardcoded in SubBillsViewer.tsx:
```typescript
const upiString = `upi://pay?pa=paytmqr5itz52@ptys&am=${onlineAmount}...`;
```

**To change UPI ID:**
1. Update the `pa` parameter value
2. Or move to environment variable for easier management

### Message Customization
Messages can be customized in SubBillsViewer.tsx:
```typescript
// Line 51: Cash message
setPaymentMessage("Please pay cash: ₹" + cashAmount.toFixed(2));

// Line 58: Credit message
setPaymentMessage("Please clear your dues on time. Credit amount: ₹" + creditAmount.toFixed(2));

// Line 74-81: Online + mixed payment messages
```

---

## Troubleshooting

### Issue: QR Code Shows Wrong Amount
**Check:**
1. Verify `payment.onlineAmount` is correct in database
2. Check console logs for payment breakdown
3. Ensure QR is generated for `onlineAmount` not `totalAmount`

**Fix:** Already implemented in the new code.

---

### Issue: Message Not Showing
**Check:**
1. Verify `paymentMessage` state is set
2. Check console logs for payment mode detection
3. Verify `paymentMessage` prop is passed to components

**Debug:**
```typescript
console.log("[SubBillsViewer] Payment breakdown:", { 
  cashAmount, 
  onlineAmount, 
  creditAmount, 
  totalAmount 
});
```

---

### Issue: Multi-line Message Not Working
**Check:**
1. Verify `white-space: pre-line` CSS is present
2. Verify message uses `\n` for line breaks
3. Check browser rendering

**Fix:** Already implemented with `white-space: pre-line`.

---

## Future Enhancements

### Possible Improvements:
1. **Configurable Messages** - Move messages to database/settings
2. **Multiple UPI IDs** - Support different UPI IDs per store/branch
3. **QR Code Customization** - Allow logo embedding in QR
4. **Language Support** - Multi-language payment instructions
5. **Payment Reminders** - SMS/Email with payment links

---

## Status: ✅ COMPLETE

Dynamic QR code generation based on payment mode is now implemented:
1. ✅ QR generated only for online payments
2. ✅ QR amount matches online amount (not total)
3. ✅ Appropriate messages for each payment mode
4. ✅ Works with both single and batch printing
5. ✅ Multi-line messages for mixed payments

**Ready for testing and deployment!**

---

**Date:** January 2025
**Files Modified:** 3
**Lines Changed:** ~150
**Impact:** High (improves payment accuracy and UX)
