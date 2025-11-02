# IST to UTC Conversion for Daily Movements

## The Problem

**Frontend sends:** `2025-11-01` (IST date)  
**Database stores:** `2025-10-31T22:30:00.000Z` (UTC timestamp)  
**Previous API:** Queried `2025-11-01T04:00:00.000Z` (UTC)  
**Result:** ❌ Mismatch - No data found

## IST to UTC Conversion

**IST (Indian Standard Time) = UTC + 5:30**

This means:
- IST 00:00 (midnight) = UTC 18:30 (previous day)
- IST 04:00 (4 AM) = UTC 22:30 (previous day)
- IST 23:59 (end of day) = UTC 18:29 (same day)

## Business Day Definition

A business day in IST runs from **4:00 AM to 3:59:59.999 AM next day**

### Example: Nov 1, 2025 (IST)

```
IST Business Day: Nov 1, 4:00 AM → Nov 2, 3:59:59.999 AM

Converted to UTC:
Start: Oct 31, 22:30:00.000 UTC
End:   Nov 1, 22:29:59.999 UTC
```

## Date Range Conversion

### Input
```
fromDate: 2025-11-01
toDate: 2025-11-01
```

### IST Business Period
```
Start: Nov 1, 4:00 AM IST
End:   Nov 2, 3:59:59.999 AM IST
```

### UTC Conversion
```
Start: Oct 31, 22:30:00.000 UTC  (Nov 1 4:00 AM IST - 5:30)
End:   Nov 1, 22:29:59.999 UTC   (Nov 2 3:59:59 AM IST - 5:30)
```

## Code Implementation

```typescript
if (fromDateStr && toDateStr) {
  // fromDate 4:00 AM IST = fromDate-1 22:30 UTC
  startOfPeriod = new Date(`${fromDateStr}T00:00:00.000Z`);
  startOfPeriod.setDate(startOfPeriod.getDate() - 1);
  startOfPeriod.setHours(22, 30, 0, 0);
  
  // toDate+1 3:59:59.999 AM IST = toDate 22:29:59.999 UTC
  endOfPeriod = new Date(`${toDateStr}T00:00:00.000Z`);
  endOfPeriod.setHours(22, 29, 59, 999);
}
```

## Timeline Visualization

```
IST Timeline:
Nov 1                          Nov 2
├──────────────────────────────┼──────────────────────────────┤
00:00                      4:00│                          4:00│
                            ▲  │                           ▲  │
                       Sales Start                    Sales End
                       
UTC Timeline:
Oct 31                         Nov 1
├──────────────────────────────┼──────────────────────────────┤
18:30                     22:30│                         22:30│
                            ▲  │                           ▲  │
                       Sales Start                    Sales End
                       (in DB)                        (in DB)
```

## Examples

### Example 1: Single Day
```
Frontend Input: 2025-11-01

IST Period:
  Start: 2025-11-01 04:00:00 IST
  End:   2025-11-02 03:59:59.999 IST

UTC Query (Database):
  Start: 2025-10-31 22:30:00.000 UTC
  End:   2025-11-01 22:29:59.999 UTC

Database Bill: 2025-10-31T22:30:00.000Z
Match: ✅ YES
```

### Example 2: Multi-Day Range
```
Frontend Input: 
  fromDate: 2025-11-01
  toDate: 2025-11-03

IST Period:
  Start: 2025-11-01 04:00:00 IST
  End:   2025-11-04 03:59:59.999 IST

UTC Query (Database):
  Start: 2025-10-31 22:30:00.000 UTC
  End:   2025-11-03 22:29:59.999 UTC

Duration: 72 hours (3 business days)
```

### Example 3: Bill Created at Different Times
```
Bill 1: Created Nov 1, 10:30 AM IST
  → Stored as: 2025-11-01T05:00:00.000Z (UTC)
  → Falls in range: ✅ YES

Bill 2: Created Nov 1, 2:00 AM IST (before business day)
  → Stored as: 2025-10-31T20:30:00.000Z (UTC)
  → Falls in range: ❌ NO (before 22:30 UTC)

Bill 3: Created Nov 2, 3:30 AM IST (end of business day)
  → Stored as: 2025-11-01T22:00:00.000Z (UTC)
  → Falls in range: ✅ YES (before 22:29:59.999 UTC)
```

## Conversion Formula

### IST to UTC
```
UTC = IST - 5:30

Examples:
IST 00:00 → UTC 18:30 (previous day)
IST 04:00 → UTC 22:30 (previous day)
IST 12:00 → UTC 06:30 (same day)
IST 23:59 → UTC 18:29 (same day)
```

### UTC to IST
```
IST = UTC + 5:30

Examples:
UTC 18:30 → IST 00:00 (next day)
UTC 22:30 → IST 04:00 (next day)
UTC 06:30 → IST 12:00 (same day)
UTC 18:29 → IST 23:59 (same day)
```

## Database Query

### Before (Wrong)
```javascript
// Query: 2025-11-01T04:00:00.000Z to 2025-11-02T03:59:59.999Z
db.bills.find({
  createdAt: {
    $gte: ISODate("2025-11-01T04:00:00.000Z"),
    $lte: ISODate("2025-11-02T03:59:59.999Z")
  }
})
// Result: ❌ Misses bills created on Nov 1 IST
```

### After (Correct)
```javascript
// Query: 2025-10-31T22:30:00.000Z to 2025-11-01T22:29:59.999Z
db.bills.find({
  createdAt: {
    $gte: ISODate("2025-10-31T22:30:00.000Z"),
    $lte: ISODate("2025-11-01T22:29:59.999Z")
  }
})
// Result: ✅ Correctly finds all bills from Nov 1 IST business day
```

## Console Logs

```
📊 Daily Movements Query: {
  fromDate: '2025-11-01',
  toDate: '2025-11-01',
  startOfPeriod: '2025-10-31T22:30:00.000Z',  // Oct 31 22:30 UTC = Nov 1 4:00 IST
  endOfPeriod: '2025-11-01T22:29:59.999Z'     // Nov 1 22:29 UTC = Nov 2 3:59 IST
}
```

## Testing

### Test Case 1: Bill at Start of Day
```
Bill Created: Nov 1, 4:00 AM IST
DB Timestamp: 2025-10-31T22:30:00.000Z
Query Range: 2025-10-31T22:30:00.000Z to 2025-11-01T22:29:59.999Z
Result: ✅ Found
```

### Test Case 2: Bill at End of Day
```
Bill Created: Nov 2, 3:59 AM IST
DB Timestamp: 2025-11-01T22:29:00.000Z
Query Range: 2025-10-31T22:30:00.000Z to 2025-11-01T22:29:59.999Z
Result: ✅ Found
```

### Test Case 3: Bill Before Business Day
```
Bill Created: Nov 1, 3:00 AM IST
DB Timestamp: 2025-10-31T21:30:00.000Z
Query Range: 2025-10-31T22:30:00.000Z to 2025-11-01T22:29:59.999Z
Result: ❌ Not Found (correct - before business day)
```

## Summary

✅ **IST dates converted to UTC properly**  
✅ **Business day: 4 AM IST to 3:59:59.999 AM IST next day**  
✅ **UTC query: Previous day 22:30 to same day 22:29:59.999**  
✅ **Database timestamps match correctly**  
✅ **All bills/purchases in IST business day found**

The API now correctly handles IST to UTC conversion for querying the database! 🎉
