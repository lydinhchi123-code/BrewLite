"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  orderId: string;
  makh: number;
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

function getMockQrUrl(
  method: "banking" | "momo",
  orderId: string,
  amount: number,
) {
  const content =
    method === "banking"
      ? `BREWLITE-MOCK-BANK-${orderId}-${amount}`
      : `BREWLITE-MOCK-MOMO-${orderId}-${amount}`;

  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(content)}`;
}

function getItemNote(item: CheckoutItem) {
  return (
    [
      item.size ? `Size ${item.size}` : "",
      item.sugar ? `Đường ${item.sugar}` : "",
      item.ice ? `Đá ${item.ice}` : "",
      item.topping?.length
        ? `Topping: ${item.topping.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join(" · ") || "Không có tuỳ chọn bổ sung"
  );
}

export default function ThanhToanPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cod");

  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [urlOrderId, setUrlOrderId] = useState("");

  useEffect(() => {
    const queryOrderId =
      new URLSearchParams(window.location.search).get("orderId") ?? "";

    try {
      const raw = localStorage.getItem("brewlite_checkout");

      if (raw) {
        const parsed = JSON.parse(raw) as CheckoutData;

        if (parsed && Array.isArray(parsed.items) && parsed.orderId) {
          const savedOrderId = String(parsed.orderId);

          if (savedOrderId === queryOrderId) {
            // URL và dữ liệu lưu trùng mã.
            setCheckout(parsed);
            setUrlOrderId(savedOrderId);
            setDiscount(parsed.discount ?? 0);

            if (parsed.paymentMethod) {
              setPaymentMethod(parsed.paymentMethod);
            }

            // Đơn đã tạo trên backend: mở lại màn hình xác nhận,
            // không cho tạo đơn lần nữa.
            if (!savedOrderId.startsWith("TEMP-")) {
              setIsSubmitted(true);
            }
          } else if (
            queryOrderId.startsWith("TEMP-") &&
            !savedOrderId.startsWith("TEMP-")
          ) {
            // Đơn đã được tạo và localStorage đã có mã thật,
            // nhưng URL vẫn giữ mã tạm cũ.
            setCheckout(parsed);
            setUrlOrderId(savedOrderId);
            setDiscount(parsed.discount ?? 0);

            if (parsed.paymentMethod) {
              setPaymentMethod(parsed.paymentMethod);
            }

            setIsSubmitted(true);

            // Đồng bộ URL với mã thật đã lưu.
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set("orderId", savedOrderId);
            window.history.replaceState(
              window.history.state,
              "",
              newUrl.toString()
            );
          }
        }
      }
    } catch (error) {
      console.error("Không thể đọc thông tin đơn hàng:", error);
    } finally {
      setLoaded(true);
    }
  }, []);

  const orderItems = checkout?.items ?? [];

  const subtotal =
    checkout?.subtotal ??
    orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

  const deliveryFee = checkout?.deliveryFee ?? 0;

  // Không cho phép giảm giá lớn hơn tổng tiền trước giảm.
  const appliedDiscount = Math.min(
    Math.max(0, discount),
    subtotal + deliveryFee,
  );

  const total = Math.max(
    0,
    subtotal + deliveryFee - appliedDiscount,
  );

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

    if (!checkout || submitting) return;

    // Nếu đã có mã thật thì không tạo lại đơn.
    if (!checkout.orderId.startsWith("TEMP-")) {
      setSubmitError("Đơn hàng đã được gửi lên hệ thống.");
      return;
    }

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setSubmitError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const customerName = String(formData.get("name") ?? "").trim();
    const customerPhone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const province = String(formData.get("city") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!customerName || !customerPhone || !address || !province) {
      setSubmitError("Vui lòng nhập đầy đủ thông tin nhận hàng.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      makh: checkout.makh,
      items: checkout.items.map((item) => ({
        id: String(item.id),
        name: item.name,
        image_url: item.image ?? null,
        price: item.price,
        quantity: item.quantity,
        size: item.size ?? "M",
        sugar: item.sugar,
        ice: item.ice,
        topping: item.topping ?? [],
      })),
      customerName,
      customerPhone,
      address,
      province,
      subtotal,
      deliveryFee,
      discount: appliedDiscount,
      totalAmount: total,
      note: note || undefined,
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : Array.isArray(data.message)
              ? data.message.join(", ")
              : "Không thể tạo đơn hàng."
        );
      }

      // OrdersService.create() trả orderId dạng ORD-...
      const realOrderId =
        data.orderId ??
        data.data?.orderId ??
        data.madonhanghienthi ??
        data.order?.madonhanghienthi ??
        data.data?.madonhanghienthi;

      if (!realOrderId || String(realOrderId).startsWith("TEMP-")) {
        throw new Error(
          "Không nhận được mã đơn hàng thật từ backend."
        );
      }

      const updatedCheckout: CheckoutData = {
        ...checkout,
        orderId: String(realOrderId),
        customerName,
        customerPhone,
        address,
        province,
        note,
        paymentMethod,
        subtotal,
        discount: appliedDiscount,
        totalAmount: total,

        // Backend hiện chưa xác minh giao dịch thật.
        // Không tự đánh dấu PAID cho QR demo.
        status: "PENDING",
      };

       // Lưu đơn hàng với mã thật từ backend.
      localStorage.setItem(
        "brewlite_checkout",
        JSON.stringify(updatedCheckout)
      );

      // Chỉ xóa giỏ hàng sau khi backend tạo đơn thành công.
      localStorage.setItem("brewlite_cart", "[]");

      // Thông báo để trang giỏ hàng cập nhật state.
      window.dispatchEvent(new Event("brewlite-cart-updated"));

      router.push(
        `/5TrangXacNhanDonHang?orderId=${encodeURIComponent(
          String(realOrderId)
        )}`
      );
    } catch (error) {
      console.error("Lỗi khi xác nhận đơn hàng:", error);

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra. Vui lòng kiểm tra lại."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="payment-page">
        <div className="container">
          Đang tải thông tin đơn hàng...
        </div>
      </main>
    );
  }

  if (!checkout || !urlOrderId || String(checkout.orderId) !== urlOrderId) {
    return (
      <main className="payment-page">
        <section className="payment-success container">
          <span className="payment-eyebrow">
            CHƯA CÓ THÔNG TIN ĐƠN HÀNG
          </span>

          <h1>Không tìm thấy đơn hàng cần thanh toán</h1>

          <p>
            Hãy quay lại giỏ hàng và tạo đơn hàng trước khi
            tiếp tục.
          </p>

          <div className="payment-success-actions">
            <Link
              href="/3TrangGioHang"
              className="payment-button primary"
            >
              Quay lại giỏ hàng
            </Link>

            <Link
              href="/2TrangMenu"
              className="payment-button secondary"
            >
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
          <span
            className="payment-success-icon"
            aria-hidden="true"
          >
            ✓
          </span>

          <span className="payment-eyebrow">
            {checkout.status === "PAID"
              ? "THANH TOÁN MÔ PHỎNG THÀNH CÔNG"
              : "ĐÃ GHI NHẬN ĐƠN HÀNG"}
          </span>

          <h1>
            {checkout.status === "PAID"
              ? "Thanh toán thành công!"
              : "Đơn hàng đã được ghi nhận"}
          </h1>

          <p>
            Mã đơn hàng{" "}
            <strong>#{checkout.orderId}</strong> đang ở
            trạng thái <strong>{checkout.status}</strong>.
            {checkout.status === "PAID"
              ? " Đây là giao dịch mô phỏng, không có tiền thật được chuyển."
              : checkout.paymentMethod === "cod"
                ? " Bạn sẽ thanh toán khi nhận hàng."
                : " Đơn hàng đã được ghi nhận. QR hiện tại chỉ là mô phỏng, hệ thống chưa xác minh giao dịch thanh toán."}
          </p>

          <p>
            Phương thức đã chọn:{" "}
            <strong>
              {checkout.paymentMethod === "cod"
                ? "Thanh toán khi nhận hàng"
                : checkout.paymentMethod === "banking"
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

            <Link
              href="/"
              className="payment-button secondary"
            >
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
          <span className="payment-eyebrow">
            BREWLITE CHECKOUT
          </span>

          <h1>Thanh toán đơn hàng</h1>

          <p>
            Hoàn tất thông tin để chúng mình chuẩn bị đơn
            hàng cho bạn.
          </p>
        </header>

        <form
          className="payment-layout"
          onSubmit={handleSubmit}
        >
          <div className="payment-main">
            <section className="payment-card">
              <div className="payment-card-heading">
                <span className="payment-step">01</span>

                <div>
                  <h2>Thông tin nhận hàng</h2>
                  <p>
                    Nhập thông tin để BrewLite giao hàng đến
                    bạn.
                  </p>
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
                    pattern="[0-9 +()-]{9,}"
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
                  Ghi chú đơn hàng{" "}
                  <span className="optional">
                    (tuỳ chọn)
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
                  <p>
                    Chọn cách thanh toán thuận tiện nhất cho
                    bạn.
                  </p>
                </div>
              </div>

              <div className="payment-methods">
                <label
                  className={`payment-method ${
                    paymentMethod === "cod" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />

                  <span
                    className="method-icon"
                    aria-hidden="true"
                  >
                    ₫
                  </span>

                  <span className="method-copy">
                    <strong>
                      Thanh toán khi nhận hàng
                    </strong>
                    <small>
                      Thanh toán bằng tiền mặt khi nhận đồ
                      uống.
                    </small>
                  </span>

                  <span
                    className="method-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${
                    paymentMethod === "banking"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="banking"
                    checked={paymentMethod === "banking"}
                    onChange={() =>
                      setPaymentMethod("banking")
                    }
                  />

                  <span
                    className="method-icon"
                    aria-hidden="true"
                  >
                    ↗
                  </span>

                  <span className="method-copy">
                    <strong>
                      Chuyển khoản ngân hàng
                    </strong>
                    <small>
                      Quét mã QR mô phỏng cho đơn hàng.
                    </small>
                  </span>

                  <span
                    className="method-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${
                    paymentMethod === "momo"
                      ? "selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="momo"
                    checked={paymentMethod === "momo"}
                    onChange={() => setPaymentMethod("momo")}
                  />

                  <span
                    className="method-icon momo-icon"
                    aria-hidden="true"
                  >
                    M
                  </span>

                  <span className="method-copy">
                    <strong>Ví MoMo</strong>
                    <small>
                      Quét mã QR MoMo mô phỏng cho đơn hàng.
                    </small>
                  </span>

                  <span
                    className="method-check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </label>
              </div>
            </section>

            {/* QR nằm ngay dưới phần chọn phương thức */}
            {(paymentMethod === "banking" ||
              paymentMethod === "momo") && (
              <section className="mock-payment-panel">
                <div className="mock-payment-heading">
                  <div>
                    <h3>
                      {paymentMethod === "banking"
                        ? "Quét QR chuyển khoản ngân hàng"
                        : "Quét QR thanh toán MoMo"}
                    </h3>

                    <p>
                      Thanh toán mô phỏng dành cho đồ án
                      BrewLite
                    </p>
                  </div>

                  <span className="mock-payment-badge">
                    DEMO
                  </span>
                </div>

                <div className="mock-payment-content">
                  <div className="mock-qr-wrapper">
                    <img
                      src={getMockQrUrl(
                        paymentMethod,
                        checkout.orderId,
                        total,
                      )}
                      alt={`QR thanh toán mô phỏng ${
                        paymentMethod === "banking"
                          ? "ngân hàng"
                          : "MoMo"
                      }`}
                      width={220}
                      height={220}
                    />
                  </div>

                  <div className="mock-payment-info">
                    <p>
                      <span>Mã đơn hàng</span>
                      <strong>{checkout.orderId}</strong>
                    </p>

                    <p>
                      <span>Phương thức</span>
                      <strong>
                        {paymentMethod === "banking"
                          ? "Chuyển khoản ngân hàng"
                          : "Ví MoMo"}
                      </strong>
                    </p>

                    <p>
                      <span>Số tiền mô phỏng</span>
                      <strong className="mock-payment-amount">
                        {formatPrice(total)}
                      </strong>
                    </p>

                    <p className="mock-payment-warning">
                      Đây là QR demo, không dùng để chuyển
                      tiền thật.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          <aside className="payment-summary">
            <div className="payment-card">
              <div className="summary-heading">
                <h2>Đơn hàng của bạn</h2>
                <Link href="/3TrangGioHang">
                  Chỉnh sửa
                </Link>
              </div>

              <div className="summary-items">
                {orderItems.map((item, index) => (
                  <div
                    className="summary-item"
                    key={`${item.id}-${index}`}
                  >
                    <div className="summary-item-image" aria-hidden="true">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        "☕"
                      )}
                    </div>

                    <div className="summary-item-copy">
                      <strong>{item.name}</strong>
                      <small>{getItemNote(item)}</small>
                      <span>x{item.quantity}</span>
                    </div>

                    <strong>
                      {formatPrice(
                        item.price * item.quantity,
                      )}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="discount-form">
                <label htmlFor="discount">
                  Mã giảm giá
                </label>

                <div>
                  <input
                    id="discount"
                    value={discountCode}
                    onChange={(event) =>
                      setDiscountCode(event.target.value)
                    }
                    placeholder="Nhập mã ưu đãi"
                  />

                  <button
                    type="button"
                    onClick={applyDiscount}
                  >
                    Áp dụng
                  </button>
                </div>

                {discountMessage && (
                  <small
                    className={
                      appliedDiscount > 0
                        ? "discount-valid"
                        : "discount-invalid"
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
                  <strong>
                    {formatPrice(deliveryFee)}
                  </strong>
                </div>

                {appliedDiscount > 0 && (
                  <div className="discount-row">
                    <span>Giảm giá</span>
                    <strong>
                      -{formatPrice(appliedDiscount)}
                    </strong>
                  </div>
                )}

                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>

              {submitError && (
                <p role="alert" className="payment-error">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="payment-submit"
                disabled={submitting}
              >
                {submitting
                  ? "Đang tạo đơn hàng..."
                  : `Xác nhận phương thức · ${formatPrice(total)}`}
                <span aria-hidden="true">→</span>
              </button>

              <p className="secure-note">
                <span aria-hidden="true">⌁</span>{" "}
                Thông tin của bạn được bảo mật an toàn
              </p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}
