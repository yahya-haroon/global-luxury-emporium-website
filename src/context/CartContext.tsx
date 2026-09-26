import React, { createContext, useContext, useEffect, useState } from 'react';
import { CartItem, DeliveryZone } from '../types';
import { useData } from './DataContext';

interface CartContextType {
  items: CartItem[];
  totalCount: number;
  itemsSubtotal: number;
  personalisationSubtotal: number;
  requirementsSubtotal: number;
  deliveryPrice: number;
  totalAmount: number;
  selectedZone: DeliveryZone;
  selectedZoneId: string;
  setSelectedZoneId: (zoneId: string) => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'gle_cart_items';
const ZONE_STORAGE_KEY = 'gle_cart_zone';

function generateCartItemId(item: {
  productId: string;
  size: string;
  selectedOptions?: Record<string, string>;
  personalisationText?: string;
  requirementsText?: string;
}): string {
  const optionsKey = item.selectedOptions
    ? Object.entries(item.selectedOptions)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join('|')
    : '';
  const pKey = (item.personalisationText || '').trim();
  const rKey = (item.requirementsText || '').trim();
  return `${item.productId}__${item.size}__${optionsKey}__${pKey}__${rKey}`;
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useData();

  // 1. Initial cart items from localStorage
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Selected delivery zone
  const [selectedZoneId, setSelectedZoneIdState] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem(ZONE_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  // 3. Drawer open state
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Sync cart items to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [items]);

  // Sync selected delivery zone
  const setSelectedZoneId = (zoneId: string) => {
    setSelectedZoneIdState(zoneId);
    try {
      localStorage.setItem(ZONE_STORAGE_KEY, zoneId);
    } catch {
      // ignore
    }
  };

  // Determine active delivery zone object
  const deliveryZones = settings.delivery_zones || [];
  const selectedZone: DeliveryZone =
    deliveryZones.find((z) => z.id === selectedZoneId) ||
    deliveryZones[0] || { id: 'standard', name: 'Standard Delivery', price: 0 };

  // Price calculations
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const personalisationSubtotal = items.reduce(
    (sum, item) => sum + (item.personalisationFee || 0) * item.quantity,
    0
  );

  const requirementsSubtotal = items.reduce(
    (sum, item) => sum + (item.requirementsFee || 0) * item.quantity,
    0
  );

  // CRITICAL REQUIREMENT: Delivery fee is FLAT for the entire order,
  // charged ONCE, never multiplied by number of products or quantities!
  const deliveryPrice = Number(selectedZone.price || 0);

  const totalAmount = Number(
    (itemsSubtotal + personalisationSubtotal + requirementsSubtotal + deliveryPrice).toFixed(2)
  );

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addItem = (
    itemData: Omit<CartItem, 'id' | 'quantity'> & { quantity?: number }
  ) => {
    const id = generateCartItemId(itemData);
    const addQty = itemData.quantity && itemData.quantity > 0 ? itemData.quantity : 1;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + addQty,
        };
        return updated;
      }
      return [
        ...prevItems,
        {
          ...itemData,
          id,
          quantity: addQty,
        },
      ];
    });

    // Automatically slide drawer open so customer sees their bag
    setIsCartOpen(true);
  };

  const updateQuantity = (id: string, delta: number) => {
    setItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        itemsSubtotal,
        personalisationSubtotal,
        requirementsSubtotal,
        deliveryPrice,
        totalAmount,
        selectedZone,
        selectedZoneId: selectedZone.id,
        setSelectedZoneId,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
