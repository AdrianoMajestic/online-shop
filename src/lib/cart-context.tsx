"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession } from "@/lib/auth-client";
import { EnrichedCartItem, EnrichedCartResult } from "@/services/cart.service";

const GUEST_CART_KEY = "kabachok_cart";

export interface RawCartItem {
  productId: string;
  quantity: number;
}

interface CartContextType {
  items: EnrichedCartItem[];
  totalQuantity: number;
  totalAmount: number; // in kopecks
  isLoading: boolean;
  error: string | null;
  addItem: (
    productId: string,
    quantity?: number
  ) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (
    productId: string,
    quantity: number
  ) => Promise<{ success: boolean; error?: string }>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  mergeGuestCartOnAuth: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

function getGuestCartFromStorage(): RawCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter(
          (item) =>
            item &&
            typeof item.productId === "string" &&
            typeof item.quantity === "number" &&
            item.quantity > 0
        )
        .map((i) => ({ productId: i.productId, quantity: Math.floor(i.quantity) }));
    }
    return [];
  } catch {
    return [];
  }
}

function saveGuestCartToStorage(items: RawCartItem[]) {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) {
      localStorage.removeItem(GUEST_CART_KEY);
    } else {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }
  } catch {
    // LocalStorage quota or access error handling
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: sessionData, isPending: isSessionLoading } = useSession();
  const [items, setItems] = useState<EnrichedCartItem[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const prevAuthUserId = useRef<string | null | undefined>(undefined);

  const isAuthenticated = Boolean(sessionData?.user?.id);
  const userId = sessionData?.user?.id;

  // Sync state from server response
  const applyCartResult = useCallback((cart: EnrichedCartResult) => {
    setItems(cart.items || []);
    setTotalQuantity(cart.totalQuantity || 0);
    setTotalAmount(cart.totalAmount || 0);
  }, []);

  // Fetch prices & stock for guest items from server without saving to DB
  const enrichGuestItems = useCallback(
    async (guestItems: RawCartItem[]) => {
      if (guestItems.length === 0) {
        applyCartResult({ items: [], totalQuantity: 0, totalAmount: 0 });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch("/api/cart/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: guestItems }),
        });

        if (!res.ok) {
          throw new Error("Не удалось загрузить цены корзины");
        }

        const data = await res.json();
        if (data.cart) {
          applyCartResult(data.cart);
        }
      } catch (err) {
        console.error("[Cart] Ошибка обогащения гостевой корзины:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [applyCartResult]
  );

  // Fetch authenticated user's cart from DB
  const fetchUserCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/cart");
      if (!res.ok) {
        throw new Error("Не удалось загрузить корзину пользователя");
      }
      const data = await res.json();
      if (data.cart) {
        applyCartResult(data.cart);
      }
    } catch (err) {
      console.error("[Cart] Ошибка загрузки серверной корзины:", err);
    } finally {
      setIsLoading(false);
    }
  }, [applyCartResult]);

  // Merge guest localStorage cart into user DB cart upon authentication
  const mergeGuestCartOnAuth = useCallback(async () => {
    const guestItems = getGuestCartFromStorage();
    if (guestItems.length === 0) {
      await fetchUserCart();
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: guestItems }),
      });

      if (!res.ok) {
        throw new Error("Не удалось объединить гостевую корзину");
      }

      const data = await res.json();
      if (data.cart) {
        applyCartResult(data.cart);
        // Clear localStorage after successful merge
        saveGuestCartToStorage([]);
      }
    } catch (err) {
      console.error("[Cart] Ошибка слияния корзин:", err);
      // Fallback: fetch user cart anyway
      await fetchUserCart();
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserCart, applyCartResult]);

  // Main lifecycle effect: handles session changes, merging, and initial load
  useEffect(() => {
    if (isSessionLoading) return;

    if (isAuthenticated) {
      // User is logged in
      if (prevAuthUserId.current !== userId) {
        prevAuthUserId.current = userId;
        mergeGuestCartOnAuth();
      }
    } else {
      // User is a guest
      prevAuthUserId.current = null;
      const guestItems = getGuestCartFromStorage();
      enrichGuestItems(guestItems);
    }
  }, [
    isSessionLoading,
    isAuthenticated,
    userId,
    mergeGuestCartOnAuth,
    enrichGuestItems,
  ]);

  // Listen to cross-tab storage changes for guest cart
  useEffect(() => {
    if (isAuthenticated) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === GUEST_CART_KEY) {
        const updatedGuestItems = getGuestCartFromStorage();
        enrichGuestItems(updatedGuestItems);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isAuthenticated, enrichGuestItems]);

  // Add item to cart
  const addItem = async (productId: string, quantity = 1) => {
    setError(null);
    try {
      if (isAuthenticated) {
        // Authenticated user: update in DB via PUT /api/cart
        // Existing items + new item
        const existingItem = items.find((i) => i.productId === productId);
        const newQuantity = (existingItem?.quantity || 0) + quantity;

        const updatedRawItems: RawCartItem[] = items.map((i) => ({
          productId: i.productId,
          quantity: i.productId === productId ? newQuantity : i.quantity,
        }));

        if (!existingItem) {
          updatedRawItems.push({ productId, quantity });
        }

        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedRawItems }),
        });

        const data = await res.json();
        if (!res.ok) {
          const errMsg = data.error?.message || "Не удалось добавить товар в корзину";
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        if (data.cart) {
          applyCartResult(data.cart);
        }
        return { success: true };
      } else {
        // Guest user: update localStorage then fetch fresh prices
        const guestItems = getGuestCartFromStorage();
        const existingIdx = guestItems.findIndex(
          (i) => i.productId === productId
        );

        if (existingIdx >= 0) {
          guestItems[existingIdx].quantity += quantity;
        } else {
          guestItems.push({ productId, quantity });
        }

        saveGuestCartToStorage(guestItems);
        await enrichGuestItems(guestItems);
        return { success: true };
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : "Произошла ошибка при добавлении в корзину";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // Update quantity of an item
  const updateQuantity = async (productId: string, quantity: number) => {
    setError(null);
    if (quantity <= 0) {
      await removeItem(productId);
      return { success: true };
    }

    try {
      if (isAuthenticated) {
        const updatedRawItems = items.map((i) => ({
          productId: i.productId,
          quantity: i.productId === productId ? quantity : i.quantity,
        }));

        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedRawItems }),
        });

        const data = await res.json();
        if (!res.ok) {
          const errMsg =
            data.error?.message || "Не удалось изменить количество товара";
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        if (data.cart) {
          applyCartResult(data.cart);
        }
        return { success: true };
      } else {
        const guestItems = getGuestCartFromStorage();
        const idx = guestItems.findIndex((i) => i.productId === productId);
        if (idx >= 0) {
          guestItems[idx].quantity = quantity;
          saveGuestCartToStorage(guestItems);
          await enrichGuestItems(guestItems);
        }
        return { success: true };
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Произошла ошибка при изменении количества";
      setError(errMsg);
      return { success: false, error: errMsg };
    }
  };

  // Remove item from cart
  const removeItem = async (productId: string) => {
    setError(null);
    try {
      if (isAuthenticated) {
        const updatedRawItems = items
          .filter((i) => i.productId !== productId)
          .map((i) => ({ productId: i.productId, quantity: i.quantity }));

        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedRawItems }),
        });

        const data = await res.json();
        if (data.cart) {
          applyCartResult(data.cart);
        }
      } else {
        const guestItems = getGuestCartFromStorage().filter(
          (i) => i.productId !== productId
        );
        saveGuestCartToStorage(guestItems);
        await enrichGuestItems(guestItems);
      }
    } catch (err) {
      console.error("[Cart] Ошибка удаления товара:", err);
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    setError(null);
    try {
      if (isAuthenticated) {
        const res = await fetch("/api/cart", { method: "DELETE" });
        const data = await res.json();
        if (data.cart) {
          applyCartResult(data.cart);
        }
      } else {
        saveGuestCartToStorage([]);
        applyCartResult({ items: [], totalQuantity: 0, totalAmount: 0 });
      }
    } catch (err) {
      console.error("[Cart] Ошибка очистки корзины:", err);
    }
  };

  const refreshCart = async () => {
    if (isAuthenticated) {
      await fetchUserCart();
    } else {
      const guestItems = getGuestCartFromStorage();
      await enrichGuestItems(guestItems);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        totalQuantity,
        totalAmount,
        isLoading,
        error,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
        mergeGuestCartOnAuth,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
