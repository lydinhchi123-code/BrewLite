"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import "./thanh-toan.css";

type PaymentMethod = "cod" | "banking" | "momo";

type CheckoutItem = {
  id: string | number;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  size?: string;
  sugar?: string;
  ice?: string;
  topping?: string[];
};

type CheckoutData = {
  orderId?: string;
  items: CheckoutItem[];
  customerName: string;
  customerPhone: string;
  address: string;
  province: string;
  note?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
  status: string;
  paymentMethod?: PaymentMethod;
};

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}₫`;

function getItemNote(item: CheckoutItem) {
  return (
    [
      item.size ? `Size ${item.size}` : "",
      item.sugar ? `Đường ${item.sugar}` : "",
      item.ice ? `Đá ${item.ice}` : "",
      item.topping?.length ? `Topping: ${item.topping.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Không có tuỳ chọn bổ sung"
  );
}

export default function ThanhToanPage() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [urlOrderId, setUrlOrderId] = useState("");

  useEffect(() => {
    const queryOrderId =
      new URLSearchParams(window.location.search).get("orderId") ?? "";
    setUrlOrderId(queryOrderId);

    try {
      const raw = localStorage.getItem("brewlite_checkout");
      if (raw) {
        const parsed = JSON.parse(raw) as CheckoutData;
        if (parsed && Array.isArray(parsed.items)) {
          // Không hiển thị nhầm thông tin của đơn khác với mã trên URL.
          if (!queryOrderId || String(parsed.orderId) === queryOrderId) {
            setCheckout(parsed);
            if (parsed.paymentMethod) setPaymentMethod(parsed.paymentMethod);
          }
        }
      }
    } catch (error) {
      console.error("Không thể đọc thông tin đơn hàng:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!checkout || !checkout.items.some((item) => !item.image)) return;

    const controller = new AbortController();
    async function loadMissingImages() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/menu/products`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) return;

        const payload = await response.json();
        const products = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        const items = checkout.items.map((item) => {
          if (item.image) return item;
          const product = products.find(
            (candidate: {
              id?: string | number;
              name?: string;
              imageUrl?: string;
              image_url?: string;
              image?: string;
            }) =>
              String(candidate.id) === String(item.id) ||
              candidate.name?.toLocaleLowerCase("vi-VN") ===
                item.name.toLocaleLowerCase("vi-VN"),
          );
          const image = product?.imageUrl ?? product?.image_url ?? product?.image;
          return typeof image === "string" && image
            ? { ...item, image }
            : item;
        });

        if (items.some((item, index) => item.image !== checkout.items[index].image)) {
          const updatedCheckout = { ...checkout, items };
          setCheckout(updatedCheckout);
          localStorage.setItem(
            "brewlite_checkout",
            JSON.stringify(updatedCheckout),
          );
        }
      } catch (error) {
        if (!(error instanceof Error && error.name === "AbortError")) {
          console.error("Không tải được ảnh món trong đơn hàng:", error);
        }
      }
    }

    void loadMissingImages();
    return () => controller.abort();
  }, [checkout]);

  const orderItems = checkout?.items ?? [];
  const subtotal =
    checkout?.subtotal ??
    orderItems.reduce((total, item) => total + item.price * item.quantity, 0);
  const deliveryFee = checkout?.deliveryFee ?? 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  function applyDiscount() {
    if (discountCode.trim().toUpperCase() === "BREW10") {
      setDiscount(10000);
      setDiscountMessage("Đã áp dụng mã giảm 10.000₫.");
      return;
    }

    setDiscount(0);
    setDiscountMessage(
      discountCode.trim()
        ? "Mã giảm giá không hợp lệ hoặc đã hết hạn."
        : "Vui lòng nhập mã giảm giá.",
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkout || isSubmitting) return;

    const token = localStorage.getItem("brewlite_accessToken");
    if (!token) {
      setSubmitError("Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để đặt hàng.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const customerName = String(formData.get("name") ?? "").trim();
    const customerPhone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const province = String(formData.get("city") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const isEditingExistingOrder = Boolean(checkout.orderId);
      const response = await fetch(
        `${apiUrl}/orders${
          isEditingExistingOrder
            ? `/${encodeURIComponent(checkout.orderId!)}`
            : ""
        }`,
        {
          method: isEditingExistingOrder ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: checkout.items,
            customerName,
            customerPhone,
            address,
            province,
            subtotal,
            deliveryFee,
            discount,
            totalAmount: total,
            note: note || undefined,
          }),
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

      const orderId =
        data.orderId ?? data.id ?? data.data?.orderId ?? data.data?.id;
      if (orderId == null) {
        throw new Error("Máy chủ chưa trả về mã đơn hàng.");
      }

      const updatedCheckout: CheckoutData = {
        ...checkout,
        orderId: String(orderId),
        customerName,
        customerPhone,
        address,
        province,
        note,
        discount,
        totalAmount: total,
        paymentMethod,
        status: "SUBMITTED",
      };
      localStorage.setItem("brewlite_checkout", JSON.stringify(updatedCheckout));
      localStorage.removeItem("brewlite_cart");
      setCheckout(updatedCheckout);
      setIsSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Có lỗi xảy ra khi đặt hàng.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="payment-page">
        <div className="container">Đang tải thông tin đơn hàng...</div>
      </main>
    );
  }

  if (!checkout || checkout.items.length === 0) {
    return (
      <main className="payment-page">
        <section className="payment-success container">
          <span className="payment-eyebrow">CHƯA CÓ THÔNG TIN ĐƠN HÀNG</span>
          <h1>Không tìm thấy đơn hàng cần thanh toán</h1>
          <p>Hãy quay lại giỏ hàng và tạo đơn hàng trước khi tiếp tục.</p>
          <div className="payment-success-actions">
            <Link href="/3TrangGioHang" className="payment-button primary">
              Quay lại giỏ hàng
            </Link>
            <Link href="/2TrangMenu" className="payment-button secondary">
              Về Menu
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (isSubmitted) {
    return (
      <main className="payment-page">
        <section className="payment-success container">
          <span className="payment-success-icon" aria-hidden="true">
            ✓
          </span>
          <span className="payment-eyebrow">
            ĐÃ GHI NHẬN LỰA CHỌN THANH TOÁN
          </span>
          <h1>Đơn hàng đang chờ xử lý</h1>
          <p>
            Mã đơn hàng <strong>#{checkout.orderId}</strong> đang ở trạng thái
            <strong> PENDING </strong> (chờ thanh toán/xử lý). Đây mới là thao
            tác mô phỏng; cổng thanh toán thật và cập nhật trạng thái backend
            chưa được tích hợp.
          </p>
          <p>
            Phương thức đã chọn:{" "}
            <strong>
              {paymentMethod === "cod"
                ? "Thanh toán khi nhận hàng"
                : paymentMethod === "banking"
                  ? "Chuyển khoản ngân hàng"
                  : "Ví MoMo"}
            </strong>
            .
          </p>
          <div className="payment-success-actions">
            <Link
              href="/7TrangTheoDoiDonHang"
              className="payment-button primary"
            >
              Theo dõi đơn hàng
            </Link>
            <Link href="/" className="payment-button secondary">
              Về trang chủ
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <div className="container">
        <div className="payment-breadcrumb">
          <Link href="/3TrangGioHang">Giỏ hàng</Link>
          <span aria-hidden="true">/</span>
          <strong>Thanh toán</strong>
        </div>

        <header className="payment-heading">
          <span className="payment-eyebrow">BREWLITE CHECKOUT</span>
          <h1>Thanh toán đơn hàng</h1>
          <p>Hoàn tất thông tin để chúng mình chuẩn bị đơn hàng cho bạn.</p>
        </header>

        <form className="payment-layout" onSubmit={handleSubmit}>
          <div className="payment-main">
            <section className="payment-card">
              <div className="payment-card-heading">
                <span className="payment-step">01</span>
                <div>
                  <h2>Thông tin nhận hàng</h2>
                  <p>Nhập thông tin để BrewLite giao hàng đến bạn.</p>
                </div>
              </div>

              <div className="payment-fields">
                <label>
                  Họ và tên
                  <input
                    name="name"
                    type="text"
                    defaultValue={checkout.customerName}
                    placeholder="Nguyễn Minh Anh"
                    required
                  />
                </label>
                <label>
                  Số điện thoại
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={checkout.customerPhone}
                    placeholder="090 123 4567"
                    inputMode="numeric"
                    minLength={10}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    title="Số điện thoại phải gồm đúng 10 chữ số."
                    required
                  />
                </label>
                <label className="field-wide">
                  Địa chỉ nhận hàng
                  <input
                    name="address"
                    type="text"
                    defaultValue={checkout.address}
                    placeholder="Số nhà, tên đường"
                    required
                  />
                </label>
                <label>
                  Tỉnh / Thành phố
                  <input
                    name="city"
                    type="text"
                    defaultValue={checkout.province}
                    placeholder="Tỉnh / thành phố"
                    required
                  />
                </label>
                <label>
                  <span>
                    Ghi chú đơn hàng{" "}
                    <span className="optional">(tuỳ chọn)</span>
                  </span>
                  <input
                    name="note"
                    type="text"
                    defaultValue={checkout.note ?? ""}
                    placeholder="Ví dụ: Giao giờ hành chính"
                  />
                </label>
              </div>
            </section>

            <section className="payment-card">
              <div className="payment-card-heading">
                <span className="payment-step">02</span>
                <div>
                  <h2>Phương thức thanh toán</h2>
                  <p>Chọn cách thanh toán thuận tiện nhất cho bạn.</p>
                </div>
              </div>

              <div className="payment-methods">
                <label
                  className={`payment-method ${paymentMethod === "cod" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span className="method-icon" aria-hidden="true">
                    ₫
                  </span>
                  <span className="method-copy">
                    <strong>Thanh toán khi nhận hàng</strong>
                    <small>Thanh toán bằng tiền mặt khi nhận đồ uống.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${paymentMethod === "banking" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="banking"
                    checked={paymentMethod === "banking"}
                    onChange={() => setPaymentMethod("banking")}
                  />
                  <span className="method-icon" aria-hidden="true">
                    ↗
                  </span>
                  <span className="method-copy">
                    <strong>Chuyển khoản ngân hàng</strong>
                    <small>Quét mã QR hoặc chuyển khoản nhanh.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${paymentMethod === "momo" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="momo"
                    checked={paymentMethod === "momo"}
                    onChange={() => setPaymentMethod("momo")}
                  />
                  <span className="method-icon momo-icon" aria-hidden="true">
                    M
                  </span>
                  <span className="method-copy">
                    <strong>Ví MoMo</strong>
                    <small>Thanh toán nhanh chóng qua ví điện tử MoMo.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside className="payment-summary">
            <div className="payment-card">
              <div className="summary-heading">
                <h2>Đơn hàng của bạn</h2>
                <Link href="/3TrangGioHang">Chỉnh sửa</Link>
              </div>

              <div className="summary-items">
                {orderItems.map((item, index) => (
                  <div className="summary-item" key={`${item.id}-${index}`}>
                    <div className="summary-item-image">
                      {item.image ? (
                        <img src={item.image} alt="" loading="lazy" />
                      ) : (
                        <span aria-hidden="true">☕</span>
                      )}
                    </div>
                    <div className="summary-item-copy">
                      <strong>{item.name}</strong>
                      <small>{getItemNote(item)}</small>
                      <span>x{item.quantity}</span>
                    </div>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="discount-form">
                <label htmlFor="discount">Mã giảm giá</label>
                <div>
                  <input
                    id="discount"
                    value={discountCode}
                    onChange={(event) => setDiscountCode(event.target.value)}
                    placeholder="Nhập mã ưu đãi"
                  />
                  <button type="button" onClick={applyDiscount}>
                    Áp dụng
                  </button>
                </div>
                {discountMessage && (
                  <small
                    className={
                      discount > 0 ? "discount-valid" : "discount-invalid"
                    }
                  >
                    {discountMessage}
                  </small>
                )}
              </div>

              <div className="summary-totals">
                <div>
                  <span>Tạm tính</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>
                <div>
                  <span>Phí giao hàng</span>
                  <strong>{formatPrice(deliveryFee)}</strong>
                </div>
                {discount > 0 && (
                  <div className="discount-row">
                    <span>Giảm giá</span>
                    <strong>-{formatPrice(discount)}</strong>
                  </div>
                )}
                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>

              {submitError && (
                <p className="discount-invalid" role="alert">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="payment-submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Đang tạo đơn..."
                  : `Xác nhận phương thức · ${formatPrice(total)}`}
                <span aria-hidden="true">→</span>
              </button>
              <p className="secure-note">
                <span aria-hidden="true">⌁</span> Thông tin của bạn được bảo mật
                an toàn
              </p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
