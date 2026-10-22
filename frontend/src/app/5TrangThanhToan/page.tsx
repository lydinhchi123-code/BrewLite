"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import "./thanh-toan.css";

type PaymentMethod = "cod" | "banking" | "momo";

const orderItems = [
  { id: 1, name: "Cà phê sữa đá", note: "Size M · Ít đá", quantity: 2, price: 35000 },
  { id: 2, name: "Caramel Macchiato", note: "Size M", quantity: 1, price: 55000 },
];

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}₫`;

export default function ThanhToanPage() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const subtotal = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const deliveryFee = 15000;
  const total = subtotal + deliveryFee - discount;

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <main className="payment-page">
        <section className="payment-success container">
          <span className="payment-success-icon" aria-hidden="true">
            ✓
          </span>
          <span className="payment-eyebrow">ĐẶT HÀNG THÀNH CÔNG</span>
          <h1>Cảm ơn bạn đã đặt hàng!</h1>
          <p>
            Đơn hàng <strong>#BL-20261021</strong> đã được tiếp nhận. BrewLite
            sẽ chuẩn bị thức uống và thông báo cho bạn sớm nhất.
          </p>
          <div className="payment-success-actions">
            <Link href="/7TrangTheoDoiDonHang" className="payment-button primary">
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
          <Link href="/4TrangGioHang">Giỏ hàng</Link>
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
                  <input name="name" type="text" placeholder="Nguyễn Minh Anh" required />
                </label>
                <label>
                  Số điện thoại
                  <input
                    name="phone"
                    type="tel"
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
                    placeholder="Số nhà, tên đường"
                    required
                  />
                </label>
                <label>
                  Tỉnh / Thành phố
                  <select name="city" defaultValue="" required>
                    <option value="" disabled>
                      Chọn tỉnh / thành phố
                    </option>
                    <option>Thành phố Hồ Chí Minh</option>
                    <option>Hà Nội</option>
                    <option>Đà Nẵng</option>
                    <option>Cần Thơ</option>
                  </select>
                </label>
                <label>
                  Ghi chú đơn hàng <span className="optional">(tuỳ chọn)</span>
                  <input name="note" type="text" placeholder="Ví dụ: Giao giờ hành chính" />
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
                <label className={`payment-method ${paymentMethod === "cod" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />
                  <span className="method-icon" aria-hidden="true">₫</span>
                  <span className="method-copy">
                    <strong>Thanh toán khi nhận hàng</strong>
                    <small>Thanh toán bằng tiền mặt khi nhận đồ uống.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">✓</span>
                </label>

                <label className={`payment-method ${paymentMethod === "banking" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="banking"
                    checked={paymentMethod === "banking"}
                    onChange={() => setPaymentMethod("banking")}
                  />
                  <span className="method-icon" aria-hidden="true">↗</span>
                  <span className="method-copy">
                    <strong>Chuyển khoản ngân hàng</strong>
                    <small>Quét mã QR hoặc chuyển khoản nhanh.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">✓</span>
                </label>

                <label className={`payment-method ${paymentMethod === "momo" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="momo"
                    checked={paymentMethod === "momo"}
                    onChange={() => setPaymentMethod("momo")}
                  />
                  <span className="method-icon momo-icon" aria-hidden="true">M</span>
                  <span className="method-copy">
                    <strong>Ví MoMo</strong>
                    <small>Thanh toán nhanh chóng qua ví điện tử MoMo.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">✓</span>
                </label>
              </div>
            </section>
          </div>

          <aside className="payment-summary">
            <div className="payment-card">
              <div className="summary-heading">
                <h2>Đơn hàng của bạn</h2>
                <Link href="/4TrangGioHang">Chỉnh sửa</Link>
              </div>

              <div className="summary-items">
                {orderItems.map((item) => (
                  <div className="summary-item" key={item.id}>
                    <div className="summary-item-image" aria-hidden="true">☕</div>
                    <div className="summary-item-copy">
                      <strong>{item.name}</strong>
                      <small>{item.note}</small>
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
                  <button type="button" onClick={applyDiscount}>Áp dụng</button>
                </div>
                {discountMessage && (
                  <small className={discount > 0 ? "discount-valid" : "discount-invalid"}>
                    {discountMessage}
                  </small>
                )}
              </div>

              <div className="summary-totals">
                <div><span>Tạm tính</span><strong>{formatPrice(subtotal)}</strong></div>
                <div><span>Phí giao hàng</span><strong>{formatPrice(deliveryFee)}</strong></div>
                {discount > 0 && (
                  <div className="discount-row"><span>Giảm giá</span><strong>-{formatPrice(discount)}</strong></div>
                )}
                <div className="summary-total"><span>Tổng cộng</span><strong>{formatPrice(total)}</strong></div>
              </div>

              <button type="submit" className="payment-submit">
                Đặt hàng · {formatPrice(total)}
                <span aria-hidden="true">→</span>
              </button>
              <p className="secure-note"><span aria-hidden="true">⌁</span> Thông tin của bạn được bảo mật an toàn</p>
            </div>
          </aside>
        </form>
      </div>
    </main>
  );
}