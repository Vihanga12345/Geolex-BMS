import React, { useState, useRef } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface MultiSelectorProps {
  placeholder?: string;
  selectedItems?: string[];
  onSelectionChange?: (items: string[]) => void;
  allowDuplicates?: boolean;
  maxItems?: number | null;
  defaultAttributes?: string[];
}

const MultiSelector: React.FC<MultiSelectorProps> = ({ 
  placeholder = "Type and press Enter to add...",
  selectedItems = [],
  onSelectionChange = () => {},
  allowDuplicates = false,
  maxItems = null,
  defaultAttributes = []
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [items, setItems] = useState<string[]>(selectedItems);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper function to ensure default attributes are always first
  const ensureDefaultAttributesFirst = (attributes: string[]): string[] => {
    const nonDefaultAttributes = attributes.filter(attr => 
      !defaultAttributes.some(defaultAttr => defaultAttr.toLowerCase() === attr.toLowerCase())
    );
    return [...defaultAttributes, ...nonDefaultAttributes];
  };

  const addItem = (value: string): void => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) return;
    
    // Check if trying to add a default attribute
    if (defaultAttributes.some(attr => attr.toLowerCase() === trimmedValue.toLowerCase())) {
      toast.error(`${trimmedValue} is a default attribute and cannot be added manually`);
      setInputValue('');
      return;
    }
    
    // Check for duplicates if not allowed
    if (!allowDuplicates && items.includes(trimmedValue)) {
      setInputValue('');
      return;
    }
    
    // Check max items limit
    if (maxItems && items.length >= maxItems) {
      setInputValue('');
      return;
    }
    
    const newItems = ensureDefaultAttributesFirst([...items, trimmedValue]);
    setItems(newItems);
    onSelectionChange(newItems);
    setInputValue('');
  };

  const removeItem = (indexToRemove: number): void => {
    const itemToRemove = items[indexToRemove];
    
    // Check if trying to remove a default attribute
    if (defaultAttributes.some(attr => attr.toLowerCase() === itemToRemove.toLowerCase())) {
      toast.error(`${itemToRemove} is a default attribute and cannot be removed`);
      return;
    }
    
    const newItems = ensureDefaultAttributesFirst(items.filter((_, index) => index !== indexToRemove));
    setItems(newItems);
    onSelectionChange(newItems);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && items.length > 0) {
      // Remove last item if backspace is pressed on empty input
      // But check if the last item is a default attribute
      const lastItem = items[items.length - 1];
      if (defaultAttributes.some(attr => attr.toLowerCase() === lastItem.toLowerCase())) {
        toast.error(`${lastItem} is a default attribute and cannot be removed`);
        return;
      }
      removeItem(items.length - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setInputValue(e.target.value);
  };

  const handleContainerClick = (): void => {
    inputRef.current?.focus();
  };

  // Helper function to check if an item is a default attribute
  const isDefaultAttribute = (item: string): boolean => {
    return defaultAttributes.some(attr => attr.toLowerCase() === item.toLowerCase());
  };

  return (
    <div className="w-full">
      <div 
        className="min-h-12 p-2 border-2 border-gray-300 rounded-lg focus-within:border-blue-500 cursor-text bg-white"
        onClick={handleContainerClick}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {items.map((item, index) => (
            <span
              key={index}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                isDefaultAttribute(item) 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {item}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(index);
                }}
                className={`ml-1 rounded-full p-0.5 transition-colors ${
                  isDefaultAttribute(item)
                    ? 'hover:bg-red-200'
                    : 'hover:bg-blue-200'
                }`}
                aria-label={`Remove ${item}`}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={items.length === 0 ? placeholder : ""}
            className="flex-1 min-w-32 outline-none bg-transparent text-gray-700 placeholder-gray-400"
          />
        </div>
      </div>
      
      {items.length > 0 && (
        <div className="mt-3 text-sm text-gray-600">
          Selected items: {items.length}
          {maxItems && ` / ${maxItems}`}
        </div>
      )}
      
      {defaultAttributes.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 bg-red-100 rounded-full border border-red-200"></span>
            Red attributes are default and cannot be removed ({defaultAttributes.join(', ')})
          </span>
        </div>
      )}
    </div>
  );
};

export default MultiSelector;