// E-commerce to ERP Order Sync API Endpoint
// This endpoint receives order data from the e-commerce website
// and creates corresponding records in the ERP system

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://mvltluuepbmvfrliflco.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12bHRsdXVlcGJtdmZybGlmbGNvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjY3MjQyMCwiZXhwIjoyMDUyMjQ4NDIwfQ.nKJMgNVlDJgEGCQ1yagF9F7kqCtcKlmJo8OEWgR0vNE';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Constants
const E_COMMERCE_BUSINESS_ID = '550e8400-e29b-41d4-a716-446655440000';

interface EcommerceOrderData {
  orderId: string;
  customerInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: Array<{
    productId: string;
    productName: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  paymentMethod: string;
  orderDate: string;
  notes?: string;
}

interface OrderSyncResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  error?: string;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const orderData: EcommerceOrderData = req.body;

    // Validate required fields
    if (!orderData.orderId || !orderData.customerInfo || !orderData.items || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required order data'
      });
    }

    console.log('Processing order sync:', orderData.orderId);

    // 1. Create or find customer
    const customerResult = await createOrFindCustomer(orderData.customerInfo);
    if (!customerResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to create customer: ${customerResult.error}`
      });
    }

    // 2. Create or find inventory items for the products
    const inventoryResult = await createOrFindInventoryItems(orderData.items);
    if (!inventoryResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to process inventory items: ${inventoryResult.error}`
      });
    }

    // 3. Generate ERP order number
    const orderNumber = await generateOrderNumber();

    // 4. Create sales order
    const orderResult = await createSalesOrder({
      orderNumber,
      customerId: customerResult.customerId!,
      orderData,
      inventoryItems: inventoryResult.inventoryItems!
    });

    if (!orderResult.success) {
      return res.status(500).json({
        success: false,
        error: `Failed to create sales order: ${orderResult.error}`
      });
    }

    console.log('Order sync completed successfully:', {
      ecommerceOrderId: orderData.orderId,
      erpOrderId: orderResult.orderId,
      erpOrderNumber: orderNumber
    });

    const response: OrderSyncResponse = {
      success: true,
      orderId: orderResult.orderId,
      orderNumber: orderNumber
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Error syncing order:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}

// Helper function to create or find customer
async function createOrFindCustomer(customerInfo: EcommerceOrderData['customerInfo']): Promise<{
  success: boolean;
  customerId?: string;
  error?: string;
}> {
  try {
    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', customerInfo.email)
      .eq('business_id', E_COMMERCE_BUSINESS_ID)
      .single();

    if (existingCustomer) {
      return {
        success: true,
        customerId: existingCustomer.id
      };
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        telephone: customerInfo.phone,
        address: `${customerInfo.address}, ${customerInfo.city}, ${customerInfo.state} ${customerInfo.postalCode}, ${customerInfo.country}`,
        email: customerInfo.email,
        business_id: E_COMMERCE_BUSINESS_ID,
        source: 'website',
        registered_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    return {
      success: true,
      customerId: newCustomer.id
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in customer creation'
    };
  }
}

// Helper function to create or find inventory items
async function createOrFindInventoryItems(items: EcommerceOrderData['items']): Promise<{
  success: boolean;
  inventoryItems?: Array<{ id: string; sku: string; name: string }>;
  error?: string;
}> {
  try {
    const inventoryItems: Array<{ id: string; sku: string; name: string }> = [];

    for (const item of items) {
      const sku = item.sku || item.productId;

      // Check if inventory item already exists
      const { data: existingItem } = await supabase
        .from('inventory_items')
        .select('id, sku, name')
        .eq('sku', sku)
        .eq('business_id', E_COMMERCE_BUSINESS_ID)
        .single();

      if (existingItem) {
        inventoryItems.push(existingItem);
        continue;
      }

      // Create new inventory item
      const { data: newItem, error } = await supabase
        .from('inventory_items')
        .insert({
          name: item.productName,
          description: `Website product: ${item.productName}`,
          category: 'Website Products',
          unit_of_measure: 'pcs',
          purchase_cost: item.unitPrice * 0.7, // Assume 30% markup
          selling_price: item.unitPrice,
          current_stock: 1000, // Default stock for website products
          reorder_level: 10,
          sku: sku,
          is_active: true,
          business_id: E_COMMERCE_BUSINESS_ID
        })
        .select('id, sku, name')
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to create inventory item for ${item.productName}: ${error.message}`
        };
      }

      inventoryItems.push(newItem);
    }

    return {
      success: true,
      inventoryItems
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in inventory creation'
    };
  }
}

// Helper function to create sales order
async function createSalesOrder(params: {
  orderNumber: string;
  customerId: string;
  orderData: EcommerceOrderData;
  inventoryItems: Array<{ id: string; sku: string; name: string }>;
}): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> {
  try {
    const { orderNumber, customerId, orderData, inventoryItems } = params;

    // Create sales order
    const { data: salesOrder, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        order_date: orderData.orderDate,
        total_amount: orderData.totalAmount,
        status: 'Order Confirmed',
        payment_method: orderData.paymentMethod,
        notes: orderData.notes || 'Website Sales',
        business_id: E_COMMERCE_BUSINESS_ID,
        order_source: 'website'
      })
      .select('id')
      .single();

    if (orderError) {
      return {
        success: false,
        error: orderError.message
      };
    }

    // Create sales order items
    const orderItems = orderData.items.map((item, index) => {
      const inventoryItem = inventoryItems.find(inv => inv.sku === (item.sku || item.productId));
      
      if (!inventoryItem) {
        throw new Error(`Inventory item not found for SKU: ${item.sku || item.productId}`);
      }

      return {
        sales_order_id: salesOrder.id,
        product_id: inventoryItem.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        discount: 0
      };
    });

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) {
      // Clean up - delete the sales order if items creation failed
      await supabase
        .from('sales_orders')
        .delete()
        .eq('id', salesOrder.id);

      return {
        success: false,
        error: `Failed to create order items: ${itemsError.message}`
      };
    }

    // Create order status history
    await supabase
      .from('sales_order_status_history')
      .insert({
        sales_order_id: salesOrder.id,
        new_status: 'Order Confirmed',
        reason: 'Initial order placement from website'
      });

    return {
      success: true,
      orderId: salesOrder.id
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in sales order creation'
    };
  }
}

// Helper function to generate order number
async function generateOrderNumber(): Promise<string> {
  try {
    // Get the last order number for today
    const today = new Date().toISOString().split('T')[0];
    
    const { data: lastOrder } = await supabase
      .from('sales_orders')
      .select('order_number')
      .eq('business_id', E_COMMERCE_BUSINESS_ID)
      .like('order_number', 'WEB-%')
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastOrder?.order_number) {
      const match = lastOrder.order_number.match(/WEB-(\d{6})$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `WEB-${nextNumber.toString().padStart(6, '0')}`;

  } catch (error) {
    // If there's an error, just use timestamp-based number
    return `WEB-${Date.now().toString().slice(-6)}`;
  }
} 