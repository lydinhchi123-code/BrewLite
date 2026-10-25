"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type SubmitEvent } from "react";
import "./TrangGioHang.css";

type SizeOption = {
  code: string;
  name: string;
  price: number;
};

type ToppingOption = {
  id?: number;
  name: string;
  price: number;
};

type Product = {
  id: number;
  name: string;
  image?: string;
  price: number;
  category?: string;
  categorySlug?: string;
  description?: string;
  sizes?: SizeOption[];
  toppings?: ToppingOption[];
};

type CartItem = {
  key: string;
  product: Product;
  size?: string;
  sizeName?: string;
  sugar?: string | null;
  ice?: string | null;
  toppings?: ToppingOption[];
  qty: number;
  unitPrice: number;
};

const money = (value: number) => value.toLocaleString("vi-VN") + " đ";

function isCake(product: Product) {
  return (
    product.categorySlug === "banh" ||
    product.categorySlug === "banh-ngot" ||
    (product.category ?? "").toLocaleLowerCase("vi-VN").includes("bánh")
  );
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderError, setOrderError] = useState("");

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editSize, setEditSize] = useState("M");
  const [editSugar, setEditSugar] = useState("100%");
  const [editIce, setEditIce] = useState("100%");
  const [editToppings, setEditToppings] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("brewlite_cart");
      console.log("Dữ liệu giỏ hàng:", savedCart);

      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        console.log("Số món đọc được:", parsed.length);

        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch (error) {
      console.error("Không thể đọc giỏ hàng:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    console.log("STATE ITEMS HIỆN TẠI:", items.length);
  }, [items]);

  function saveCart(newItems: CartItem[]) {
    setItems(newItems);

    try {
      localStorage.setItem("brewlite_cart", JSON.stringify(newItems));
    } catch (error) {
      console.error("Không thể lưu giỏ hàng:", error);
      alert("Không thể lưu giỏ hàng. Bạn hãy thử lại nhé!");
    }
  }

  function updateQuantity(key: string, qty: number) {
    if (qty < 1) return;

    saveCart(items.map((item) => (item.key === key ? { ...item, qty } : item)));
  }

  function removeItem(key: string) {
    saveCart(items.filter((item) => item.key !== key));

    if (editingKey === key) {
      setEditingKey(null);
    }
  }

  async function handlePlaceOrder(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    if (submitting || items.length === 0) return;
    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setOrderError(
        "Bạn cần đăng nhập trước khi đặt hàng. Hãy đăng nhập bằng nút tài khoản ở đầu trang, sau đó quay lại bấm đặt hàng.",
      );
      return;
    }

    setSubmitting(true);
    setOrderError("");
    setOrderMessage("");

    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.qty,
      0,
    );

    const payload = {
      items: items.map((item) => ({
        id: String(item.product.id),
        name: item.product.name,
        price: item.unitPrice,
        quantity: item.qty,
        size: item.sizeName ?? item.size ?? "M",
        sugar: item.sugar ?? undefined,
        ice: item.ice ?? undefined,
        topping: (item.toppings ?? []).map((t) => t.name),
      })),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      province: province.trim(),
      subtotal,
      deliveryFee: 0,
      discount: 0,
      totalAmount: subtotal,
      note: note.trim() || undefined,
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/orders`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join(", ")
              : "Không thể tạo đơn hàng.",
        );
      }

      // Hỗ trợ một số kiểu response phổ biến từ NestJS.
      const orderId =
        data.orderId ?? data.id ?? data.data?.orderId ?? data.data?.id;

      if (orderId == null) {
        throw new Error(
          "API đã phản hồi thành công nhưng chưa có mã đơn hàng. Hãy kiểm tra response của POST /orders.",
        );
      }

      // Lưu thông tin đơn vừa tạo để trang thanh toán hiển thị đúng món và tổng tiền.
      const checkoutData = {
        orderId: String(orderId),
        items: payload.items,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        address: payload.address,
        province: payload.province,
        note: payload.note ?? "",
        subtotal: payload.subtotal,
        deliveryFee: payload.deliveryFee,
        discount: payload.discount,
        totalAmount: payload.totalAmount,
        status: "PENDING",
      };

      localStorage.setItem("brewlite_checkout", JSON.stringify(checkoutData));
      localStorage.removeItem("brewlite_cart");
      setItems([]);

      // Task 6 chỉ tạo đơn. Chuyển sang trang thanh toán; không tuyên bố đã thanh toán.
      router.push(
        `/5TrangThanhToan?orderId=${encodeURIComponent(String(orderId))}`,
      );
    } catch (error) {
      setOrderError(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi đặt hàng.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(item: CartItem) {
    setEditingKey(item.key);

    const sizes = item.product.sizes ?? [];
    const currentSize =
      sizes.find((s) => s.code === item.size)?.code ??
      sizes[0]?.code ??
      item.size ??
      "M";

    setEditSize(currentSize);
    setEditSugar(item.sugar ?? "100%");
    setEditIce(item.ice ?? "100%");
    setEditToppings((item.toppings ?? []).map((t) => t.name));
  }

  function closeEdit() {
    setEditingKey(null);
  }

  const editingItem = items.find((item) => item.key === editingKey);
  const editingProduct = editingItem?.product;

  const editingCake = editingProduct ? isCake(editingProduct) : false;
  const editingSizes = editingProduct?.sizes ?? [];
  const editingToppings =
    editingProduct && !editingCake ? (editingProduct.toppings ?? []) : [];

  const chosenSize = editingSizes.find((s) => s.code === editSize);
  const editProductPrice = chosenSize?.price ?? editingProduct?.price ?? 0;

  const editToppingPrice = editingToppings
    .filter((t) => editToppings.includes(t.name))
    .reduce((sum, t) => sum + t.price, 0);

  const editUnitPrice = editProductPrice + editToppingPrice;

  function saveEdit() {
    if (!editingItem || !editingProduct) return;

    const selectedToppings = editingToppings.filter((t) =>
      editToppings.includes(t.name),
    );

    const newKey = `${editingProduct.id}-${editSize}-${editSugar}-${editIce}-${editToppings
      .slice()
      .sort()
      .join(",")}`;

    const updatedItem: CartItem = {
      ...editingItem,
      key: newKey,
      product: {
        ...editingProduct,
        price: editProductPrice,
      },
      size: editSize,
      sizeName: chosenSize?.name ?? editSize,
      sugar: editingCake ? null : editSugar,
      ice: editingCake ? null : editIce,
      toppings: selectedToppings,
      unitPrice: editUnitPrice,
    };

    // Bỏ món cũ ra trước, sau đó gộp nếu cấu hình mới trùng món khác.
    const remainingItems = items.filter((item) => item.key !== editingItem.key);

    const duplicateIndex = remainingItems.findIndex(
      (item) => item.key === newKey,
    );

    if (duplicateIndex >= 0) {
      remainingItems[duplicateIndex] = {
        ...remainingItems[duplicateIndex],
        qty: remainingItems[duplicateIndex].qty + editingItem.qty,
      };
    } else {
      remainingItems.push(updatedItem);
    }

    saveCart(remainingItems);
    closeEdit();
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + item.unitPrice * item.qty,
    0,
  );

  if (!loaded) {
    return <div className="bl-cart-loading">Đang tải giỏ hàng...</div>;
  }

  if (items.length === 0) {
    console.log("ĐANG KIỂM TRA NHÁNH GIỎ HÀNG TRỐNG");
    return (
      <main className="bl-menu-page">
        <div className="bl-cart-empty">
          <h2 className="bl-cart-empty-title">Giỏ hàng của bạn đang trống</h2>

          <p className="bl-cart-muted">
            Hãy quay lại trang Menu để chọn món ngon nhé!
          </p>

          <a href="/2TrangMenu" className="bl-cart-back-link">
            Quay lại Menu
          </a>
        </div>
      </main>
    );
  }

  console.log("LOADED:", loaded);
  console.log("ITEMS TRƯỚC KHI HIỂN THỊ:", items);

  return (
    <main className="bl-menu-page">
      <div className="bl-cart-container">
        <h1 className="bl-cart-title">Giỏ hàng của bạn</h1>

        <div className="bl-cart-items">
          {items.map((item) => (
            <div key={item.key} className="bl-cart-item">
              <div className="bl-cart-product">
                {item.product.image && (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="bl-cart-product-image"
                  />
                )}

                <div className="bl-cart-product-info">
                  <h3 className="bl-cart-product-name">{item.product.name}</h3>

                  <p className="bl-cart-detail">
                    Size: {item.sizeName ?? item.size ?? "M"}
                  </p>

                  {item.sugar && (
                    <p className="bl-cart-detail">Đường: {item.sugar}</p>
                  )}

                  {item.ice && <p className="bl-cart-detail">Đá: {item.ice}</p>}

                  {item.toppings && item.toppings.length > 0 && (
                    <p className="bl-cart-detail">
                      Topping: {item.toppings.map((t) => t.name).join(", ")}
                    </p>
                  )}

                  <p className="bl-cart-unit-price">{money(item.unitPrice)}</p>
                </div>
              </div>

              <div className="bl-cart-quantity">
                <button
                  onClick={() => updateQuantity(item.key, item.qty - 1)}
                  disabled={item.qty <= 1}
                  className="bl-cart-quantity-button"
                >
                  -
                </button>

                <span className="bl-cart-quantity-value">{item.qty}</span>

                <button
                  onClick={() => updateQuantity(item.key, item.qty + 1)}
                  className="bl-cart-quantity-button"
                >
                  +
                </button>
              </div>

              <div className="bl-cart-line-total">
                {money(item.unitPrice * item.qty)}
              </div>

              <div className="bl-cart-actions">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="bl-cart-edit-button"
                >
                  Chỉnh sửa
                </button>

                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="bl-cart-remove-button"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handlePlaceOrder} className="bl-cart-form">
          <h2 className="bl-cart-section-title">Thông tin nhận hàng</h2>

          <div className="bl-cart-form-grid">
            <input
              required
              maxLength={100}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Họ tên người nhận"
              className="bl-cart-field"
            />

            <input
              required
              maxLength={20}
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Số điện thoại"
              className="bl-cart-field"
            />

            <input
              required
              maxLength={100}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="Tỉnh / thành phố"
              className="bl-cart-field"
            />

            <input
              required
              maxLength={500}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Địa chỉ giao hàng"
              className="bl-cart-field"
            />
          </div>

          <textarea
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú cho đơn hàng (không bắt buộc)"
            className="bl-cart-field"
            rows={3}
          />

          <div className="bl-cart-summary">
            <div className="bl-cart-total">
              Tổng thanh toán:{" "}
              <span className="bl-cart-total-amount">{money(totalPrice)}</span>
            </div>

            {orderMessage && (
              <p role="status" className="bl-cart-success">
                {orderMessage}
              </p>
            )}

            {orderError && (
              <p role="alert" className="bl-cart-error">
                {orderError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || items.length === 0}
              className="bl-cart-submit"
            >
              {submitting ? "Đang đặt hàng..." : "Tiến hành đặt hàng"}
            </button>
          </div>
        </form>
      </div>

      {editingItem && editingProduct && (
        <div
          className="bl-menu-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <section
            className="bl-menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bl-cart-edit-title"
          >
            <button
              className="bl-menu-modal-close"
              type="button"
              onClick={closeEdit}
              aria-label="Đóng"
            >
              ×
            </button>

            <div className="bl-menu-modal-image">
              {editingProduct.image ? (
                <img src={editingProduct.image} alt={editingProduct.name} />
              ) : (
                <span className="bl-menu-no-image">☕</span>
              )}
            </div>

            <div className="bl-menu-modal-content">
              <span className="bl-menu-category">Chỉnh sửa món trong giỏ</span>

              <h2 id="bl-cart-edit-title">{editingProduct.name}</h2>

              <p>Điều chỉnh lựa chọn của bạn rồi lưu thay đổi nhé.</p>

              <div className="bl-menu-modal-options">
                {editingSizes.length > 0 && (
                  <div className="bl-menu-option">
                    <div className="bl-menu-option-title">Chọn size</div>

                    <div className="bl-menu-choice">
                      {editingSizes.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          className={editSize === s.code ? "selected" : ""}
                          onClick={() => setEditSize(s.code)}
                        >
                          {s.name}
                          <small>{money(s.price)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!editingCake && (
                  <>
                    <div className="bl-menu-option">
                      <div className="bl-menu-option-title">Đường</div>

                      <div className="bl-menu-choice">
                        {["0%", "50%", "100%"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={editSugar === s ? "selected" : ""}
                            onClick={() => setEditSugar(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bl-menu-option">
                      <div className="bl-menu-option-title">Đá</div>

                      <div className="bl-menu-choice">
                        {["Không đá", "50%", "100%"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={editIce === s ? "selected" : ""}
                            onClick={() => setEditIce(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editingToppings.length > 0 && (
                      <div className="bl-menu-option">
                        <div className="bl-menu-option-title">Topping</div>

                        <div className="bl-menu-choice">
                          {editingToppings.map((t) => (
                            <button
                              key={t.id ?? t.name}
                              type="button"
                              className={
                                editToppings.includes(t.name) ? "selected" : ""
                              }
                              onClick={() =>
                                setEditToppings((old) =>
                                  old.includes(t.name)
                                    ? old.filter((x) => x !== t.name)
                                    : [...old, t.name],
                                )
                              }
                            >
                              {t.name}
                              <small>{money(t.price)}</small>
                              {editToppings.includes(t.name) ? " ✓" : " ＋"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bl-menu-modal-footer">
                <div className="bl-menu-modal-bottom">
                  <div className="bl-menu-total">
                    <small>Giá một món</small>
                    <strong>{money(editUnitPrice)}</strong>
                  </div>

                  <button type="button" onClick={saveEdit}>
                    Lưu thay đổi <span>✓</span>
                  </button>
                </div>

                <small className="bl-menu-cart-hint">
                  Số lượng hiện tại: {editingItem.qty}. Tổng tiền sẽ được cập
                  nhật sau khi lưu.
                </small>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
