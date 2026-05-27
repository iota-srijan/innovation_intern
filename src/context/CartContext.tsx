import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { CartItem } from '../types';

const CART_KEY = 'sp-cart';

interface CartContextValue {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (item_id: string) => void;
  updateQuantity: (item_id: string, qty: number) => void;
  updatePurpose: (item_id: string, purpose: string) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextValue>({
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  updatePurpose: () => {},
  clearCart: () => {},
  cartCount: 0,
});

// Exported ref so AuthContext can call clearCart on logout without circular imports
export const clearCartRef: { current: (() => void) | null } = { current: null };

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]): void {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>(loadCart);

  // Sync to localStorage on every change
  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(CART_KEY);
    } catch {
      // ignore
    }
  }, []);

  // Register clearCart so AuthContext can call it on logout
  useEffect(() => {
    clearCartRef.current = clearCart;
    return () => {
      clearCartRef.current = null;
    };
  }, [clearCart]);

  const addToCart = useCallback((item: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === item.item_id);
      if (existing) {
        // Update quantity, capped at available
        return prev.map((c) =>
          c.item_id === item.item_id
            ? {
                ...c,
                quantity_requested: Math.min(
                  item.quantity_requested,
                  c.available_quantity
                ),
                purpose: item.purpose || c.purpose,
              }
            : c
        );
      }
      return [
        ...prev,
        {
          ...item,
          quantity_requested: Math.min(
            item.quantity_requested,
            item.available_quantity
          ),
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((item_id: string) => {
    setCart((prev) => prev.filter((c) => c.item_id !== item_id));
  }, []);

  const updateQuantity = useCallback((item_id: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.item_id === item_id
          ? {
              ...c,
              quantity_requested: Math.min(
                Math.max(1, qty),
                c.available_quantity
              ),
            }
          : c
      )
    );
  }, []);

  const updatePurpose = useCallback((item_id: string, purpose: string) => {
    setCart((prev) =>
      prev.map((c) => (c.item_id === item_id ? { ...c, purpose } : c))
    );
  }, []);

  const cartCount = cart.length;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        updatePurpose,
        clearCart,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
