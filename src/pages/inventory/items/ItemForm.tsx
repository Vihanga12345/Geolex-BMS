import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Upload, Tags, Plus, X } from 'lucide-react';
import { UnitOfMeasure, InventoryItem } from '@/types';
import { useInventory } from '@/hooks/useInventory';
import { toast } from 'sonner';
import CategoryManagement from '@/components/ui/CategoryManagement';
import { supabase } from '@/integrations/supabase/client';

const unitOfMeasureOptions: { value: UnitOfMeasure; label: string }[] = [
  { value: 'pieces', label: 'Pieces' },
  { value: 'kg', label: 'Kilogram (kg)' },
  { value: 'liters', label: 'Liter' },
  { value: 'meters', label: 'Meter' },
  { value: 'units', label: 'Units' }
];

interface Category {
  id: string;
  name: string;
  attributes: string[];
}

const ItemForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  const { addItem, updateItem, getItemById, isLoading, items } = useInventory();

  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Force re-render trigger

  // Fetch categories from database
  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('category')
        .select('*')
        .order('name');

      if (error) throw error;

      const formattedCategories: Category[] = (data || []).map(cat => ({
        id: cat.id,
        name: cat.name,
        attributes: Array.isArray(cat.attributes) ? cat.attributes as string[] : []
      }));

      setCategories(formattedCategories);
      
      // Set default category if none selected and categories exist
      if (!formData.category && formattedCategories.length > 0) {
        setFormData(prev => ({ ...prev, category: formattedCategories[0].id }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to fetch categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Handle category created from modal
  const handleCategoryCreated = async (categoryId: string, categoryName: string) => {
    try {
      // Refresh categories first
      await fetchCategories();
      
      // Wait a bit for categories to be updated
      setTimeout(() => {
        // Set the new category as selected
        setFormData(prev => ({ ...prev, category: categoryId }));
        
        // Force re-render to show new attributes
        setForceRender(prev => prev + 1);
        
        // Trigger category change to update specifications
        handleCategoryChange(categoryId);
        
        toast.success(`Category "${categoryName}" created and selected with attributes`);
      }, 300);
      
    } catch (error) {
      console.error('Error handling category creation:', error);
      toast.error('Failed to select new category');
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    category: '', // Will store category ID
    specification: {} as Record<string, string>, // JSONB object for specifications
    unitOfMeasure: 'pieces' as UnitOfMeasure,
    purchaseCost: '0',
    sellingPrice: '0',
    currentStock: '0',
    reorderLevel: '0',
    sku: '',
    isActive: true,
    isWebsiteItem: false,
    imageUrl: '',
    salePrice: '',
    weight: '0'
  });

  // Custom fields for this specific item (not in category attributes)
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);

  // Helper function to parse complex nested JSON specifications
  const parseSpecifications = (specifications: any): Record<string, string> => {
    try {
      if (!specifications) return {};
      
      let parsed = specifications;
      
      // If it's a string, parse it
      if (typeof specifications === 'string') {
        parsed = JSON.parse(specifications);
      }
      
      // Handle the malformed structure from your example
      if (parsed.features && Array.isArray(parsed.features)) {
        // Extract from features array
        const featuresString = parsed.features[0];
        if (typeof featuresString === 'string') {
          const featuresObj = JSON.parse(featuresString);
          // Remove nested description and return clean object
          const { description, ...cleanSpecs } = featuresObj;
          return cleanSpecs;
        }
      }
      
      // If it's already a clean object, return as is
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      
      return {};
    } catch (error) {
      console.error('Error parsing specifications:', error);
      return {};
    }
  };

  useEffect(() => {
    if (isEditMode && id && !isLoading) {
      // Wait for items to load before trying to find the item
      const item = getItemById(id);
      if (item) {
        console.log('Loading item for edit:', item);
        // Find category ID from category name (for now, until we update the database schema)
        const categoryId = categories.find(cat => cat.name === item.category)?.id || '';
        
        // Parse specifications into clean JSON object
        const parsedSpecs = parseSpecifications(item.specifications);
        
        setFormData({
          name: item.name,
          category: categoryId,
          specification: parsedSpecs,
          unitOfMeasure: item.unitOfMeasure,
          purchaseCost: item.purchaseCost.toString(),
          sellingPrice: item.sellingPrice.toString(),
          currentStock: item.currentStock.toString(),
          reorderLevel: item.reorderLevel.toString(),
          sku: item.sku || '',
          isActive: item.isActive,
          isWebsiteItem: item.isWebsiteItem || false,
          imageUrl: item.imageUrl || '',
          salePrice: item.salePrice?.toString() || '',
          weight: item.weight?.toString() || '0'
        });

        // Separate category attributes from custom fields
        const selectedCategory = categories.find(cat => cat.id === categoryId);
        const categoryAttributes = selectedCategory?.attributes || [];
        
        // Custom fields are those not in category attributes
        const customFieldsData = Object.entries(parsedSpecs)
          .filter(([key]) => !categoryAttributes.includes(key) && key !== 'description')
          .map(([key, value]) => ({ key, value: String(value) }));
        
        setCustomFields(customFieldsData);
      } else if (items.length > 0) {
        // Items have loaded but item not found
        console.error('Item not found with ID:', id, 'Available items:', items.length);
        toast.error('Item not found');
        navigate('/inventory/items');
      }
      // If items.length === 0, we're still loading, so don't show error yet
    }
  }, [id, isEditMode, getItemById, navigate, isLoading, items, categories]);

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-refresh categories every 2 seconds when category modal is open
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showCategoryModal) {
      interval = setInterval(() => {
        fetchCategories();
      }, 2000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [showCategoryModal]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSpecificationChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specification: { ...prev.specification, [key]: value }
    }));
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', value: string) => {
    setCustomFields(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, isWebsiteItem: checked }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, unitOfMeasure: value as UnitOfMeasure }));
  };

  const handleCategoryChange = (value: string) => {
    const previousCategory = categories.find(cat => cat.id === formData.category);
    const newCategory = categories.find(cat => cat.id === value);
    
    const previousAttributes = previousCategory?.attributes || [];
    const newAttributes = newCategory?.attributes || [];
    
    // Move fields between category attributes and custom fields based on new category
    const updatedSpecification = { ...formData.specification };
    const updatedCustomFields = [...customFields];
    
    // Move custom fields that are now category attributes to specification
    customFields.forEach((field) => {
      if (newAttributes.includes(field.key)) {
        updatedSpecification[field.key] = field.value;
      }
    });
    
    // Remove custom fields that are now category attributes
    const filteredCustomFields = updatedCustomFields.filter(field => 
      !newAttributes.includes(field.key)
    );
    
    // Move specification fields that are no longer category attributes to custom fields
    previousAttributes.forEach(attr => {
      if (!newAttributes.includes(attr) && updatedSpecification[attr] && attr !== 'description') {
        filteredCustomFields.push({ key: attr, value: updatedSpecification[attr] });
        delete updatedSpecification[attr];
      }
    });
    
    // Ensure all new category attributes have empty values if not already set
    newAttributes.forEach(attr => {
      if (!updatedSpecification[attr] && attr !== 'description') {
        updatedSpecification[attr] = '';
      }
    });
    
    setFormData(prev => ({ 
      ...prev, 
      category: value,
      specification: updatedSpecification
    }));
    setCustomFields(filteredCustomFields);
    
    // Force re-render to ensure UI updates
    setForceRender(prev => prev + 1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Item name is required');
      return;
    }
    
    // Description is now optional - removed validation
    
    const purchaseCost = parseFloat(formData.purchaseCost);
    const sellingPrice = parseFloat(formData.sellingPrice);
    const currentStock = parseInt(formData.currentStock);
    const reorderLevel = parseInt(formData.reorderLevel);

    if (isNaN(purchaseCost) || purchaseCost < 0) {
      toast.error('Purchase cost must be a positive number');
      return;
    }

    if (isNaN(sellingPrice) || sellingPrice < 0) {
      toast.error('Selling price must be a positive number');
      return;
    }

    if (isNaN(currentStock) || currentStock < 0) {
      toast.error('Current stock must be a positive number');
      return;
    }
    
    try {
      // Find category name from ID
      const selectedCategory = categories.find(cat => cat.id === formData.category);
      const categoryName = selectedCategory?.name || '';

      // Build complete specification object - clean key-value pairs only
      const completeSpecification: Record<string, string> = {};
      
      // Add description
      if (formData.specification.description?.trim()) {
        completeSpecification.description = formData.specification.description.trim();
      }
      
      // Add category attributes (only non-empty values) - Fixed the error here
      Object.entries(formData.specification).forEach(([key, value]) => {
        if (key !== 'description' && value && typeof value === 'string' && value.trim()) {
          completeSpecification[key] = value.trim();
        }
      });
      
      // Add custom fields (only non-empty values)
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          completeSpecification[field.key.trim()] = field.value.trim();
        }
      });

      const baseItemData = {
          name: formData.name,
          description: formData.specification.description || '',
          category: categoryName, // Save category name for backward compatibility
          category_id: formData.category || null, // Pass category_id - trigger will sync category name
          unitOfMeasure: formData.unitOfMeasure,
          purchaseCost,
          sellingPrice,
          currentStock,
          reorderLevel,
          sku: formData.sku || undefined,
        isActive: formData.isActive,
        isWebsiteItem: formData.isWebsiteItem,
        imageUrl: formData.isWebsiteItem ? formData.imageUrl || undefined : undefined,
        salePrice: formData.isWebsiteItem && formData.salePrice ? parseFloat(formData.salePrice) : undefined,
        weight: formData.isWebsiteItem && formData.weight ? parseFloat(formData.weight) : undefined,
        specifications: JSON.stringify(completeSpecification) // Convert to string for TEXT column
      };

      console.log('Submitting clean specification object:', completeSpecification);

      if (isEditMode && id) {
        updateItem(id, baseItemData);
        toast.success('Item updated successfully');
      } else {
        const itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'> = {
          ...baseItemData,
          category: baseItemData.category,
          sku: baseItemData.sku || ''
        };
        addItem(itemData);
        toast.success('Item added successfully');
      }
      navigate('/inventory/items');
    } catch (error) {
      console.error('Error saving item:', error);
      
      // Handle specific database errors
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as any;
        if (dbError.code === '23505') {
          if (dbError.details?.includes('sku')) {
            toast.error('SKU already exists. Please use a different SKU or leave it empty.');
          } else if (dbError.details?.includes('name')) {
            toast.error('Item name already exists. Please use a different name.');
          } else {
            toast.error('This item conflicts with existing data. Please check your inputs.');
          }
        } else {
          toast.error(`Database error: ${dbError.message || 'Unknown error'}`);
        }
      } else {
        toast.error(`Error: ${(error as Error).message}`);
      }
    }
  };

  // Show loading state while waiting for items to load in edit mode
  if (isEditMode && isLoading) {
    return (
      <Layout>
        <div className="container mx-auto">
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/items')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-3xl font-bold">Loading Item...</h1>
            </div>
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-muted-foreground">Loading item details...</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/inventory/items')} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">{isEditMode ? 'Edit Item' : 'Add Item'}</h1>
          </div>

          <Card>
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Item Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 1. Item Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Item Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter item name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                {/* 2. Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.category} 
                      onValueChange={handleCategoryChange}
                    >
                      <SelectTrigger id="category" className="flex-1">
                        <SelectValue placeholder={categoriesLoading ? "Loading categories..." : "Select category"} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => setShowCategoryModal(true)}
                      title="Manage Categories"
                    >
                      <Tags className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 3. Description (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter item description (optional)"
                    value={formData.specification.description || ''}
                    onChange={(e) => handleSpecificationChange('description', e.target.value)}
                  />
                </div>

                {/* 4. Dynamic Category Attribute Fields */}
                {formData.category && (() => {
                  const selectedCategory = categories.find(cat => cat.id === formData.category);
                  const categoryAttributes = selectedCategory?.attributes || [];
                  
                  if (categoryAttributes.length === 0) return null;
                  
                  return (
                    <div key={`${formData.category}-${forceRender}`} className="space-y-4">
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-medium mb-3">Category Attributes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {categoryAttributes.map(attribute => (
                            <div key={`${attribute}-${forceRender}`} className="space-y-2">
                              <Label htmlFor={`attr-${attribute}`}>{attribute}</Label>
                              <Input
                                id={`attr-${attribute}`}
                                placeholder={`Enter ${attribute.toLowerCase()}`}
                                value={formData.specification[attribute] || ''}
                                onChange={(e) => handleSpecificationChange(attribute, e.target.value)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 5. Custom Fields */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium">Custom Fields</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomField}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Field
                      </Button>
                    </div>
                    {customFields.length > 0 && (
                      <div className="space-y-3">
                        {customFields.map((field, index) => (
                          <div key={index} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`custom-key-${index}`}>Field Name</Label>
                              <Input
                                id={`custom-key-${index}`}
                                placeholder="Enter field name"
                                value={field.key}
                                onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label htmlFor={`custom-value-${index}`}>Field Value</Label>
                              <Input
                                id={`custom-value-${index}`}
                                placeholder="Enter field value"
                                value={field.value}
                                onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => removeCustomField(index)}
                              className="mb-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {customFields.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No custom fields added. Click "Add Field" to add item-specific attributes.
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Rest of the form fields */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-4">Inventory Details</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                      <Select 
                        value={formData.unitOfMeasure} 
                        onValueChange={handleSelectChange}
                      >
                        <SelectTrigger id="unitOfMeasure">
                          <SelectValue placeholder="Select unit of measure" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitOfMeasureOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="purchaseCost">Purchase Cost</Label>
                        <Input
                          id="purchaseCost"
                          name="purchaseCost"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter purchase cost"
                          value={formData.purchaseCost}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sellingPrice">Selling Price</Label>
                        <Input
                          id="sellingPrice"
                          name="sellingPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Enter selling price"
                          value={formData.sellingPrice}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentStock">Initial Stock</Label>
                      <Input
                        id="currentStock"
                        name="currentStock"
                        type="number"
                        min="0"
                        placeholder="Enter initial stock quantity"
                        value={formData.currentStock}
                        onChange={handleInputChange}
                        required
                      />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reorderLevel">Reorder Level</Label>
                        <Input
                          id="reorderLevel"
                          name="reorderLevel"
                          type="number"
                          min="0"
                          placeholder="Enter reorder level"
                          value={formData.reorderLevel}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU (Optional)</Label>
                      <Input
                        id="sku"
                        name="sku"
                        placeholder="Enter SKU"
                        value={formData.sku}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Website Item Section */}
                <div className="border-t pt-4 mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isWebsiteItem" 
                        checked={formData.isWebsiteItem}
                        onCheckedChange={handleCheckboxChange}
                      />
                      <Label htmlFor="isWebsiteItem" className="text-lg font-medium">
                        Website Sale Item
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Check this box to make this item available for sale on the website
                    </p>

                    {formData.isWebsiteItem && (
                      <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                        <div className="space-y-2">
                          <Label htmlFor="imageUrl">Product Image URL</Label>
                          <div className="flex gap-2">
                            <Input
                              id="imageUrl"
                              name="imageUrl"
                              type="url"
                              placeholder="Enter image URL or upload image"
                              value={formData.imageUrl}
                              onChange={handleInputChange}
                              className="flex-1"
                            />
                            <Button type="button" variant="outline" size="icon">
                              <Upload className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Recommended size: 400x400px or higher
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="salePrice">Sale Price (Optional)</Label>
                            <Input
                              id="salePrice"
                              name="salePrice"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Enter sale price"
                              value={formData.salePrice}
                              onChange={handleInputChange}
                            />
                            <p className="text-xs text-muted-foreground">
                              Leave empty if no sale price
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="weight">Weight (kg)</Label>
                            <Input
                              id="weight"
                              name="weight"
                              type="number"
                              step="0.001"
                              min="0"
                              placeholder="Enter weight in kg"
                              value={formData.weight}
                              onChange={handleInputChange}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end space-x-2">
                <Button variant="outline" type="button" onClick={() => navigate('/inventory/items')}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {isEditMode ? 'Update Item' : 'Add Item'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>

      {/* Category Management Modal */}
      <CategoryManagement 
        open={showCategoryModal} 
        onOpenChange={(open) => {
          setShowCategoryModal(open);
          // Refresh categories when modal closes to ensure latest data
          if (!open) {
            setTimeout(() => {
              fetchCategories();
              setForceRender(prev => prev + 1);
            }, 200);
          }
        }}
        onCategoryCreated={handleCategoryCreated}
      />
    </Layout>
  );
};

export default ItemForm;