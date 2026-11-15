import { create } from "zustand";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  topping?: string[];
  image?: string;
}

export interface CartSizeOption {
  code: string;
  name: string;
  price: number;
}

export interface CartToppingOption {
  id?: number;
  name: string;
  price: number;
}

export interface BrewLiteCartItem {
  key: string;
  product: {
    id: number;
    name: string;
    image?: string;
    price: number;
    category?: string;
    categorySlug?: string;
    description?: string;
    sizes?: CartSizeOption[];
    toppings?: CartToppingOption[];
  };
  size?: string;
  sizeName?: string;
  sugar?: string | null;
  ice?: string | null;
  toppings?: CartToppingOption[];
  qty: number;
  unitPrice: number;
}

export const EMPTY_BREWLITE_CART: BrewLiteCartItem[] = [];

interface CartState {
  // Giữ API cũ cho các nơi đang dùng store mẫu.
  items: CartItem[];
  // Giỏ theo từng tài khoản/khách; localStorage vẫn là nơi lưu qua lần tải trang.
  carts: Record<string, BrewLiteCartItem[]>;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: (storageKey?: string) => void;
  loadCart: (storageKey: string) => BrewLiteCartItem[];
  setCart: (storageKey: string, items: BrewLiteCartItem[]) => void;
  addCartItem: (storageKey: string, item: BrewLiteCartItem) => void;
  updateCartQuantity: (storageKey: string, key: string, quantity: number) => void;
  removeCartItem: (storageKey: string, key: string) => void;
}

function readStoredCart(storageKey: string): BrewLiteCartItem[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as BrewLiteCartItem[]) : [];
}

export function getCartStorageKey(): string {
  if (typeof window === "undefined") return "brewlite_cart_guest";

  const savedUser = window.localStorage.getItem("brewlite_user");

  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const makh = Number(user?.makh);
      if (Number.isInteger(makh) && makh > 0) return `brewlite_cart_${makh}`;
    } catch {
      // Fall back to the guest cart when saved account data is invalid.
    }
  }

  return "brewlite_cart_guest";
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  carts: {},
  addItem: (item) =>
    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => i.id === item.id && i.size === item.size,
      );

      if (existingIndex > -1) {
        return {
          items: state.items.map((i, index) =>
            index === existingIndex
              ? { ...i, quantity: i.quantity + item.quantity }
              : i,
          ),
        };
      }

      return { items: [...state.items, { ...item }] };
    }),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
  updateQuantity: (id, quantity) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i,
      ),
    })),
  clearCart: (storageKey) => {
    if (!storageKey) {
      set({ items: [] });
      return;
    }

    if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
    set((state) => ({ carts: { ...state.carts, [storageKey]: [] } }));
  },
  loadCart: (storageKey) => {
    const items = readStoredCart(storageKey);
    set((state) => ({ carts: { ...state.carts, [storageKey]: items } }));
    return items;
  },
  setCart: (storageKey, items) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    }
    set((state) => ({ carts: { ...state.carts, [storageKey]: items } }));
  },
  addCartItem: (storageKey, item) => {
    const current = get().carts[storageKey] ?? readStoredCart(storageKey);
    const existingIndex = current.findIndex((cartItem) => cartItem.key === item.key);
    const next = [...current];

    if (existingIndex >= 0) {
      next[existingIndex] = {
        ...next[existingIndex],
        qty: next[existingIndex].qty + item.qty,
      };
    } else {
      next.push(item);
    }

    get().setCart(storageKey, next);
  },
  updateCartQuantity: (storageKey, key, quantity) => {
    if (quantity < 1) return;
    const current = get().carts[storageKey] ?? readStoredCart(storageKey);
    get().setCart(
      storageKey,
      current.map((item) => (item.key === key ? { ...item, qty: quantity } : item)),
    );
  },
  removeCartItem: (storageKey, key) => {
    const current = get().carts[storageKey] ?? readStoredCart(storageKey);
    get().setCart(storageKey, current.filter((item) => item.key !== key));
  },
}));
