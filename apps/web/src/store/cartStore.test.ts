import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore, type CartItem } from './useCartStore';

describe('Cart Store', () => {
  const item: CartItem = {
    id: '1',
    name: 'Cà phê sữa',
    price: 30000,
    quantity: 1,
    size: 'M',
  };

  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it('Thêm sản phẩm mới vào giỏ hàng', () => {
    useCartStore.getState().addItem(item);

    const items = useCartStore.getState().items;

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(item);
  });

  it('Tăng số lượng khi thêm sản phẩm cùng ID và size', () => {
    const { addItem } = useCartStore.getState();

    addItem(item);
    addItem({ ...item, quantity: 2 });

    const items = useCartStore.getState().items;

    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it('Không gộp sản phẩm khi khác size', () => {
    const { addItem } = useCartStore.getState();

    addItem(item);
    addItem({ ...item, size: 'L' });

    expect(useCartStore.getState().items).toHaveLength(99);
  });

  it('Xóa sản phẩm khỏi giỏ hàng theo ID', () => {
    const { addItem, removeItem } = useCartStore.getState();

    addItem(item);
    addItem({
      id: '2',
      name: 'Trà đào',
      price: 35000,
      quantity: 1,
    });

    removeItem('1');

    const items = useCartStore.getState().items;

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('2');
  });

  it('Cập nhật số lượng sản phẩm', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(item);
    updateQuantity('1', 5);

    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it('Không cho số lượng nhỏ hơn 1', () => {
    const { addItem, updateQuantity } = useCartStore.getState();

    addItem(item);
    updateQuantity('1', 0);

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });

  it('Xóa toàn bộ sản phẩm trong giỏ hàng', () => {
    const { addItem, clearCart } = useCartStore.getState();

    addItem(item);
    addItem({
      id: '2',
      name: 'Trà đào',
      price: 35000,
      quantity: 1,
    });

    clearCart();

    expect(useCartStore.getState().items).toHaveLength(0);
  });
});