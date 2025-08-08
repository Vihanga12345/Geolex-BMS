import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { InventoryItem, InventoryAdjustment, AdjustmentReason, UnitOfMeasure } from '@/types';

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('business_id', '550e8400-e29b-41d4-a716-446655440000')
        .order('name', { ascending: true });

      if (error) throw error;

      const transformedItems: InventoryItem[] = data.map(item => {
        // Use type assertion to handle database schema differences
        const dbItem = item as any;
        
        return {
          id: dbItem.id,
          name: dbItem.name,
          description: dbItem.description || '',
          category: dbItem.category || '',
          unitOfMeasure: dbItem.unit_of_measure as UnitOfMeasure,
          purchaseCost: dbItem.purchase_cost,
          sellingPrice: dbItem.selling_price,
          currentStock: dbItem.current_stock,
          reorderLevel: dbItem.reorder_level,
          sku: dbItem.sku || '',
          isActive: dbItem.is_active,
          createdAt: new Date(dbItem.created_at),
          updatedAt: new Date(dbItem.updated_at),
          // E-commerce fields - use safe fallbacks
          isWebsiteItem: dbItem.is_website_item || false,
          imageUrl: dbItem.image_url || '',
          additionalImages: (() => {
            try {
              return dbItem.additional_images ? JSON.parse(dbItem.additional_images) : [];
            } catch {
              return [];
            }
          })(),
          specifications: dbItem.specifications || '{}',
          weight: dbItem.weight || 0,
          dimensions: (() => {
            try {
              return dbItem.dimensions ? JSON.parse(dbItem.dimensions) : { length: 0, width: 0, height: 0 };
            } catch {
              return { length: 0, width: 0, height: 0 };
            }
          })(),
          urlSlug: dbItem.url_slug || '',
          metaDescription: dbItem.meta_description || '',
          isFeatured: dbItem.is_featured || true,
          salePrice: dbItem.sale_price || null
        };
      });

      setItems(transformedItems);
      console.log('Inventory items loaded:', data?.length);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAdjustments = useCallback(async () => {
    try {
             // Skip relationship queries until database is fixed
       let data = null;
       try {
         const { data: fallbackData, error: fallbackError } = await supabase
           .from('inventory_adjustments')
           .select('*')
           .order('adjustment_date', { ascending: false });
         
         if (!fallbackError) {
           data = fallbackData?.map(adj => ({ ...adj, inventory_items: null })) || [];
           console.log('Inventory adjustments loaded without relationships');
         } else {
           console.warn('Error fetching inventory adjustments (table may not exist):', fallbackError);
         }
       } catch (fetchError) {
         console.warn('Inventory adjustments table may not exist:', fetchError);
         setAdjustments([]);
         return;
       }

      if (!data) {
        setAdjustments([]);
        return;
      }

      if (!data) {
        setAdjustments([]);
        return;
      }

      const formattedAdjustments: InventoryAdjustment[] = data.map(adjustment => ({
        id: adjustment.id,
        itemId: adjustment.item_id,
        previousQuantity: adjustment.previous_quantity,
        newQuantity: adjustment.new_quantity,
        reason: adjustment.reason as AdjustmentReason,
        notes: adjustment.notes || '',
        adjustmentDate: new Date(adjustment.adjustment_date),
        createdBy: adjustment.created_by || 'System',
        item: {
          id: adjustment.inventory_items?.id || '',
          name: adjustment.inventory_items?.name || 'Unknown Item',
          unitOfMeasure: (adjustment.inventory_items?.unit_of_measure as UnitOfMeasure) || 'pieces',
          description: '',
          category: '',
          purchaseCost: 0,
          sellingPrice: 0,
          currentStock: 0,
          reorderLevel: 0,
          sku: '',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }));

      setAdjustments(formattedAdjustments);
    } catch (error) {
      console.error('Error fetching inventory adjustments:', error);
      // Don't show toast error for this as it's not critical for the main functionality
      setAdjustments([]);
    }
  }, []);

  const refreshInventoryData = useCallback(async () => {
    await Promise.all([
      fetchItems(),
      fetchAdjustments()
    ]);
  }, [fetchItems, fetchAdjustments]);

  useEffect(() => {
    refreshInventoryData();
  }, [refreshInventoryData]);

  const addItem = useCallback(async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase.from('inventory_items').insert({
        name: itemData.name,
        description: itemData.description || '',
        category: itemData.category || '', // Will be set by trigger based on category_id
        category_id: (itemData as any).category_id || null, // Pass category_id for trigger
        unit_of_measure: itemData.unitOfMeasure,
        purchase_cost: itemData.purchaseCost,
        selling_price: itemData.sellingPrice,
        current_stock: itemData.currentStock,
        reorder_level: itemData.reorderLevel,
        sku: itemData.sku && itemData.sku.trim() !== '' ? itemData.sku.trim() : null,
        is_active: itemData.isActive,
        business_id: '550e8400-e29b-41d4-a716-446655440000',
        is_website_item: (itemData as any).isWebsiteItem || false,
        image_url: (itemData as any).imageUrl || null,
        additional_images: '[]',
        sale_price: (itemData as any).salePrice ? parseFloat((itemData as any).salePrice) : null,
        weight: (itemData as any).weight ? parseFloat((itemData as any).weight) : 0,
        dimensions: '{"length": 0, "width": 0, "height": 0}',
        url_slug: null,
        meta_description: null,
        is_featured: true,
        specifications: (itemData as any).specifications || '{}'
      }).select().single();

      if (error) throw error;

      const newItem: InventoryItem = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        unitOfMeasure: data.unit_of_measure as UnitOfMeasure,
        purchaseCost: data.purchase_cost,
        sellingPrice: data.selling_price,
        currentStock: data.current_stock,
        reorderLevel: data.reorder_level,
        sku: data.sku || '',
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        // E-commerce fields - use safe access with type assertion
        isWebsiteItem: (data as any).is_website_item || false,
        imageUrl: (data as any).image_url || '',
        additionalImages: (() => {
          try {
            return (data as any).additional_images ? JSON.parse((data as any).additional_images) : [];
          } catch {
            return [];
          }
        })(),
        specifications: (data as any).specifications || '{}',
        weight: (data as any).weight || 0,
        dimensions: (() => {
          try {
            return (data as any).dimensions ? JSON.parse((data as any).dimensions) : { length: 0, width: 0, height: 0 };
          } catch {
            return { length: 0, width: 0, height: 0 };
          }
        })(),
        urlSlug: (data as any).url_slug || '',
        metaDescription: (data as any).meta_description || '',
        isFeatured: (data as any).is_featured || true,
        salePrice: (data as any).sale_price || null
      };

      setItems((prevItems) => [...prevItems, newItem]);
      toast.success('Inventory item added successfully');
      return newItem;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Failed to add inventory item');
      throw error;
    }
  }, []);

  const updateItem = useCallback(async (id: string, itemData: Partial<InventoryItem>) => {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Only update fields that are provided
      if (itemData.name !== undefined) updateData.name = itemData.name;
      if (itemData.description !== undefined) updateData.description = itemData.description || '';
      if (itemData.category !== undefined) updateData.category = itemData.category || ''; // Will be overridden by trigger
      if ((itemData as any).category_id !== undefined) updateData.category_id = (itemData as any).category_id || null; // Pass category_id for trigger
      if (itemData.unitOfMeasure !== undefined) updateData.unit_of_measure = itemData.unitOfMeasure;
      if (itemData.purchaseCost !== undefined) updateData.purchase_cost = itemData.purchaseCost;
      if (itemData.sellingPrice !== undefined) updateData.selling_price = itemData.sellingPrice;
      if (itemData.currentStock !== undefined) updateData.current_stock = itemData.currentStock;
      if (itemData.reorderLevel !== undefined) updateData.reorder_level = itemData.reorderLevel;
      if (itemData.sku !== undefined) updateData.sku = itemData.sku && itemData.sku.trim() !== '' ? itemData.sku.trim() : null;
      if (itemData.isActive !== undefined) updateData.is_active = itemData.isActive;
      
      // Website-related fields
      if ((itemData as any).isWebsiteItem !== undefined) updateData.is_website_item = (itemData as any).isWebsiteItem || false;
      if ((itemData as any).imageUrl !== undefined) updateData.image_url = (itemData as any).imageUrl || null;
      if ((itemData as any).salePrice !== undefined) updateData.sale_price = (itemData as any).salePrice ? parseFloat((itemData as any).salePrice) : null;
      if ((itemData as any).weight !== undefined) updateData.weight = (itemData as any).weight ? parseFloat((itemData as any).weight) : 0;
      if ((itemData as any).specifications !== undefined) {
        updateData.specifications = (itemData as any).specifications ? 
          JSON.stringify({ features: (itemData as any).specifications.split('\n').filter(Boolean) }) : 
          '{}';
      }

      const { data, error } = await supabase.from('inventory_items').update(updateData).eq('id', id).select().single();

      if (error) throw error;

      const updatedItem: InventoryItem = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        unitOfMeasure: data.unit_of_measure as UnitOfMeasure,
        purchaseCost: data.purchase_cost,
        sellingPrice: data.selling_price,
        currentStock: data.current_stock,
        reorderLevel: data.reorder_level,
        sku: data.sku || '',
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        // E-commerce fields - use safe access with type assertion
        isWebsiteItem: (data as any).is_website_item || false,
        imageUrl: (data as any).image_url || '',
        additionalImages: (() => {
          try {
            return (data as any).additional_images ? JSON.parse((data as any).additional_images) : [];
          } catch {
            return [];
          }
        })(),
        specifications: (data as any).specifications || '{}',
        weight: (data as any).weight || 0,
        dimensions: (() => {
          try {
            return (data as any).dimensions ? JSON.parse((data as any).dimensions) : { length: 0, width: 0, height: 0 };
          } catch {
            return { length: 0, width: 0, height: 0 };
          }
        })(),
        urlSlug: (data as any).url_slug || '',
        metaDescription: (data as any).meta_description || '',
        isFeatured: (data as any).is_featured || true,
        salePrice: (data as any).sale_price || null
      };

      setItems(prevItems => 
        prevItems.map(item => item.id === id ? updatedItem : item)
      );

      toast.success('Inventory item updated successfully');
      return updatedItem;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Failed to update inventory item');
      throw error;
    }
  }, []);

  const updateItemStock = useCallback(async (id: string, newQuantity: number) => {
    try {
      const item = items.find((item) => item.id === id);
      if (!item) throw new Error('Item not found');

      const previousQuantity = item.currentStock;

      await updateItem(id, {
        currentStock: newQuantity
      });

      return {
        previousQuantity,
        newQuantity
      };
    } catch (error) {
      console.error('Error updating item stock:', error);
      toast.error('Failed to update item stock');
      throw error;
    }
  }, [items, updateItem]);

  const createInventoryAdjustment = useCallback(async (
    itemId: string, 
    previousQuantity: number, 
    newQuantity: number, 
    reason: AdjustmentReason, 
    notes?: string
  ) => {
    try {
      const item = items.find((item) => item.id === itemId);
      if (!item) throw new Error('Item not found');

      // Try to insert adjustment record, but don't fail if table doesn't exist
      let adjustmentId = '';
      try {
        const { data, error } = await supabase.from('inventory_adjustments').insert({
          item_id: itemId,
          previous_quantity: previousQuantity,
          new_quantity: newQuantity,
          reason,
          notes,
          created_by: 'User'
        }).select().single();

        if (error) {
          console.warn('Could not create adjustment record (table may not exist):', error);
        } else {
          adjustmentId = data?.id || '';
        }
      } catch (adjustmentError) {
        console.warn('Adjustment table not available:', adjustmentError);
      }

      // Always update the item stock regardless of adjustment record
      await updateItem(itemId, {
        currentStock: newQuantity
      });

      const newAdjustment: InventoryAdjustment = {
        id: adjustmentId || `temp-${Date.now()}`,
        itemId,
        previousQuantity,
        newQuantity,
        reason,
        notes: notes || '',
        adjustmentDate: new Date(),
        createdBy: 'User',
        item: {
          id: item.id,
          name: item.name,
          unitOfMeasure: item.unitOfMeasure,
          description: item.description,
          category: item.category,
          purchaseCost: item.purchaseCost,
          sellingPrice: item.sellingPrice,
          currentStock: newQuantity,
          reorderLevel: item.reorderLevel,
          sku: item.sku,
          isActive: item.isActive,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      };

      setAdjustments((prevAdjustments) => [newAdjustment, ...prevAdjustments]);
      toast.success('Inventory stock updated successfully');
      return newAdjustment;
    } catch (error) {
      console.error('Error creating inventory adjustment:', error);
      toast.error('Failed to update inventory stock');
      throw error;
    }
  }, [items, updateItem]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setItems(prevItems => prevItems.filter(item => item.id !== id));
      toast.success('Inventory item deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete inventory item');
      throw error;
    }
  }, []);

  const adjustStock = useCallback(async (
    itemId: string, 
    quantityChange: number, 
    reason: AdjustmentReason, 
    notes?: string
  ) => {
    try {
      const item = items.find((item) => item.id === itemId);
      if (!item) throw new Error('Item not found');

      const previousQuantity = item.currentStock;
      const newQuantity = previousQuantity + quantityChange;

      if (newQuantity < 0) {
        throw new Error('Adjustment would result in negative stock');
      }

      await createInventoryAdjustment(
        itemId,
        previousQuantity,
        newQuantity,
        reason,
        notes
      );

      return {
        previousQuantity,
        newQuantity
      };
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
      throw error;
    }
  }, [items, createInventoryAdjustment]);

  const increaseStock = useCallback(async (
    itemId: string,
    quantity: number,
    reason: AdjustmentReason = 'return',
    notes?: string
  ) => {
    return adjustStock(itemId, quantity, reason, notes);
  }, [adjustStock]);

  const getItemById = useCallback((id: string) => {
    return items.find((item) => item.id === id);
  }, [items]);

  return {
    items,
    adjustments,
    isLoading,
    fetchItems,
    fetchAdjustments,
    refreshInventoryData,
    addItem,
    updateItem,
    updateItemStock,
    createInventoryAdjustment,
    deleteItem,
    getItemById,
    adjustStock,
    increaseStock
  };
}
