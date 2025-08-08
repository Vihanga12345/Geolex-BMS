# Database Constraint Mismatch - Fixed! 🎯

## 🐛 **Root Cause of the Error:**

The error occurred because your **database constraints** don't match your **TypeScript types**:

### **Database Constraint (Current):**
```sql
-- Sales Orders Status Check
status = ANY (ARRAY['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
-- Missing: 'draft', 'completed'

-- Inventory Adjustments Reason Check  
reason = ANY (ARRAY['damage', 'counting_error', 'return', 'theft', 'other'])
-- Missing: 'sale', 'purchase'
```

### **TypeScript Types (Your Code):**
```typescript
// Sales Order Status
type SalesOrderStatus = 'draft' | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled'

// Adjustment Reason
type AdjustmentReason = 'damage' | 'counting_error' | 'return' | 'theft' | 'other' | 'sale' | 'purchase'
```

## 🔧 **What I Fixed:**

### **1. Updated TypeScript Types:**
- ✅ Added `'sale'` and `'purchase'` to `AdjustmentReason`
- ✅ Ensured `SalesOrderStatus` includes all statuses your app uses

### **2. Created Database Fix Script:**
- ✅ `fix_database_constraints.sql` - Updates database constraints to match your types
- ✅ Drops old restrictive constraints
- ✅ Adds new comprehensive constraints

## 🚀 **Solution Steps:**

### **Step 1: Run the SQL Script**
Execute `fix_database_constraints.sql` in Supabase SQL Editor:

```sql
-- This will fix both constraints
ALTER TABLE sales_orders DROP CONSTRAINT IF EXISTS sales_orders_status_check;
ALTER TABLE sales_orders ADD CONSTRAINT sales_orders_status_check 
CHECK (status = ANY (ARRAY['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled']));

ALTER TABLE inventory_adjustments DROP CONSTRAINT IF EXISTS inventory_adjustments_reason_check;
ALTER TABLE inventory_adjustments ADD CONSTRAINT inventory_adjustments_reason_check 
CHECK (reason = ANY (ARRAY['damage', 'counting_error', 'return', 'theft', 'other', 'sale', 'purchase']));
```

### **Step 2: Test Your Sales Orders**
After running the script, you should be able to:
- ✅ Set sales order status to `'completed'`
- ✅ Create inventory adjustments with reason `'sale'`
- ✅ Use all status values without constraint violations

## 📊 **Error Analysis:**

### **Original Error Messages:**
```json
{
  "code": "23514",
  "message": "new row for relation \"sales_orders\" violates check constraint \"sales_orders_status_check\"",
  "details": "...status: completed..."
}

{
  "code": "23514", 
  "message": "new row for relation \"inventory_adjustments\" violates check constraint \"inventory_adjustments_reason_check\"",
  "details": "...reason: sale..."
}
```

### **Why This Happened:**
1. Your code tried to use `status: 'completed'` ❌
2. Database only allowed `['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']` ❌
3. Your code tried to use `reason: 'sale'` ❌  
4. Database only allowed `['damage', 'counting_error', 'return', 'theft', 'other']` ❌

### **After Fix:**
1. Code uses `status: 'completed'` ✅
2. Database allows all status values ✅
3. Code uses `reason: 'sale'` ✅
4. Database allows all reason values ✅

## 🎯 **Result:**
Your sales order status updates and inventory adjustments will now work correctly without constraint violations! 🎉

**Note:** This is a common issue when database schema and application types get out of sync. The fix ensures both stay aligned.
