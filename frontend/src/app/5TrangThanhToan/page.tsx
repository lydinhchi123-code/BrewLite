"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import "./thanh-toan.css";

type PaymentMethod = "cod" | "vnpay";
type PaymentView = "checkout" | "success" | "failure";
type FormErrors = Partial<
  Record<"name" | "phone" | "address" | "city" | "note", string>
>;
type FormField = keyof FormErrors;

const orderItems = [
  {
    id: 1,
    name: "Cà phê sữa đá",
    note: "Size M · Ít đá",
    quantity: 2,
    price: 35000,
  },
  {
    id: 2,
    name: "Caramel Macchiato",
    note: "Size M",
    quantity: 1,
    price: 55000,
  },
];

const vietnamProvinces = [
  "Hà Nội",
  "Thành phố Hồ Chí Minh",
  "Hải Phòng",
  "Đà Nẵng",
  "Cần Thơ",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bắc Giang",
  "Bắc Kạn",
  "Bạc Liêu",
  "Bắc Ninh",
  "Bến Tre",
  "Bình Định",
  "Bình Dương",
  "Bình Phước",
  "Bình Thuận",
  "Cà Mau",
  "Cao Bằng",
  "Đắk Lắk",
  "Đắk Nông",
  "Điện Biên",
  "Đồng Nai",
  "Đồng Tháp",
  "Gia Lai",
  "Hà Giang",
  "Hà Nam",
  "Hà Tĩnh",
  "Hải Dương",
  "Hậu Giang",
  "Hòa Bình",
  "Hưng Yên",
  "Khánh Hòa",
  "Kiên Giang",
  "Kon Tum",
  "Lai Châu",
  "Lâm Đồng",
  "Lạng Sơn",
  "Lào Cai",
  "Long An",
  "Nam Định",
  "Nghệ An",
  "Ninh Bình",
  "Ninh Thuận",
  "Phú Thọ",
  "Phú Yên",
  "Quảng Bình",
  "Quảng Nam",
  "Quảng Ngãi",
  "Quảng Ninh",
  "Quảng Trị",
  "Sóc Trăng",
  "Sơn La",
  "Tây Ninh",
  "Thái Bình",
  "Thái Nguyên",
  "Thanh Hóa",
  "Thừa Thiên Huế",
  "Tiền Giang",
  "Trà Vinh",
  "Tuyên Quang",
  "Vĩnh Long",
  "Vĩnh Phúc",
  "Yên Bái",
];

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}₫`;

function getPaymentView(): PaymentView {
  if (typeof window === "undefined") {
    return "checkout";
  }
  const status = new URLSearchParams(window.location.search).get("status");
  return status === "success" || status === "failure" ? status : "checkout";
}

function getFailureReason() {
  return getPaymentView() === "failure"
    ? "VNPay không xác nhận giao dịch thành công. Bạn có thể thử lại."
    : "";
}

export default function ThanhToanPage() {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [discountCode, setDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");
  const [paymentView, setPaymentView] = useState<PaymentView>(getPaymentView);
  const failureReason = getFailureReason();
  const [paymentError, setPaymentError] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [selectedCity, setSelectedCity] = useState("");
  const [isCityOpen, setIsCityOpen] = useState(false);

  const subtotal = orderItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const deliveryFee = 15000;
  const total = subtotal + deliveryFee - discount;

  function validateField(field: FormField, value: string) {
    const normalizedValue =
      field === "phone" ? value.replace(/\s/g, "") : value.trim();

    if (field === "name") {
      if (normalizedValue.length < 2) {
        return "Vui lòng nhập họ tên từ 2 ký tự.";
      }
      if (!/^[\p{L} ]+$/u.test(normalizedValue)) {
        return "Họ tên chỉ được chứa chữ cái và khoảng trắng.";
      }
    }

    if (field === "phone" && !/^0\d{9}$/.test(normalizedValue)) {
      return "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
    }

    if (field === "address" && normalizedValue.length < 10) {
      return "Địa chỉ cần có ít nhất 10 ký tự.";
    }

    if (field === "city" && !normalizedValue) {
      return "Vui lòng chọn tỉnh / thành phố.";
    }

    if (field === "note" && normalizedValue.length > 200) {
      return "Ghi chú không được vượt quá 200 ký tự.";
    }

    return undefined;
  }

  function handleFieldChange(field: FormField, value: string) {
    const error = validateField(field, value);
    setFormErrors((errors) => {
      if (error) {
        return { ...errors, [field]: error };
      }

      const nextErrors = { ...errors };
      delete nextErrors[field];
      return nextErrors;
    });
  }

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
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").replace(/\s/g, "");
    const address = String(formData.get("address") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();
    const fieldValues: Record<FormField, string> = {
      name,
      phone,
      address,
      city,
      note,
    };
    const errors = (Object.keys(fieldValues) as FormField[]).reduce<FormErrors>(
      (fieldErrors, field) => {
        const error = validateField(field, fieldValues[field]);
        if (error) {
          fieldErrors[field] = error;
        }
        return fieldErrors;
      },
      {},
    );

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    if (paymentMethod === "cod") {
      setPaymentView("success");
      return;
    }

    setPaymentError("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/payments/vnpay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            orderInfo: "Thanh toan don hang BrewLite",
          }),
        },
      );
      const result: { paymentUrl?: string; message?: string } =
        await response.json();
      if (!response.ok || !result.paymentUrl) {
        throw new Error(result.message ?? "Không thể tạo giao dịch VNPay.");
      }
      window.location.assign(result.paymentUrl);
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối cổng thanh toán VNPay.",
      );
    }
  }

  function changePaymentMethod() {
    setPaymentView("checkout");
    setPaymentError("");
  }

  if (paymentView === "success") {
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
          <div className="payment-result-detail">
            <span>Phương thức</span>
            <strong>
              {paymentMethod === "cod"
                ? "Thanh toán khi nhận hàng"
                : "VNPay · Đã thanh toán"}
            </strong>
            <span>Tổng tiền</span>
            <strong>{formatPrice(total)}</strong>
          </div>
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

  if (paymentView === "failure") {
    return (
      <main className="payment-page">
        <section className="payment-result container">
          <span className="payment-failure-icon" aria-hidden="true">
            !
          </span>
          <span className="payment-eyebrow failure-eyebrow">
            THANH TOÁN CHƯA THÀNH CÔNG
          </span>
          <h1>Không thể hoàn tất thanh toán</h1>
          <p>{failureReason}</p>
          <div className="payment-error-code">
            Mã lỗi: PAYMENT_NOT_COMPLETED
          </div>
          <div className="payment-success-actions">
            <button
              type="button"
              className="payment-button primary"
              onClick={changePaymentMethod}
            >
              Thử thanh toán lại
            </button>
            <button
              type="button"
              className="payment-button secondary"
              onClick={changePaymentMethod}
            >
              Đổi phương thức
            </button>
          </div>
          <Link href="/4TrangGioHang" className="payment-back-link">
            ← Quay lại giỏ hàng
          </Link>
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

        <form className="payment-layout" onSubmit={handleSubmit} noValidate>
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
                    placeholder="Nguyễn Văn A"
                    maxLength={100}
                    aria-invalid={Boolean(formErrors.name)}
                    className={formErrors.name ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("name", event.target.value)
                    }
                  />
                  {formErrors.name && (
                    <small className="field-error">{formErrors.name}</small>
                  )}
                </label>
                <label>
                  Số điện thoại
                  <input
                    name="phone"
                    type="tel"
                    placeholder="090 123 4567"
                    maxLength={15}
                    aria-invalid={Boolean(formErrors.phone)}
                    className={formErrors.phone ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("phone", event.target.value)
                    }
                  />
                  {formErrors.phone && (
                    <small className="field-error">{formErrors.phone}</small>
                  )}
                </label>
                <label className="field-wide">
                  Địa chỉ nhận hàng
                  <input
                    name="address"
                    type="text"
                    placeholder="Số nhà, tên đường"
                    maxLength={255}
                    aria-invalid={Boolean(formErrors.address)}
                    className={formErrors.address ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("address", event.target.value)
                    }
                  />
                  {formErrors.address && (
                    <small className="field-error">{formErrors.address}</small>
                  )}
                </label>
                <label>
                  <span className="field-label">Tỉnh / Thành phố</span>
                  <input type="hidden" name="city" value={selectedCity} />
                  <div className={`city-picker ${isCityOpen ? "open" : ""}`}>
                    <button
                      type="button"
                      className={`city-picker-trigger ${formErrors.city ? "field-invalid" : ""}`}
                      aria-haspopup="listbox"
                      aria-expanded={isCityOpen}
                      onClick={() => setIsCityOpen((open) => !open)}
                    >
                      <span className={selectedCity ? "" : "city-placeholder"}>
                        {selectedCity || "Chọn tỉnh / thành phố"}
                      </span>
                      <span className="city-picker-chevron" aria-hidden="true">
                        ⌄
                      </span>
                    </button>
                    {isCityOpen && (
                      <div
                        className="city-picker-menu"
                        role="listbox"
                        aria-label="Tỉnh / Thành phố"
                      >
                        {vietnamProvinces.map((province) => (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selectedCity === province}
                            className={`city-picker-option ${selectedCity === province ? "selected" : ""}`}
                            key={province}
                            onClick={() => {
                              setSelectedCity(province);
                              setIsCityOpen(false);
                              handleFieldChange("city", province);
                            }}
                          >
                            {province}
                            {selectedCity === province && (
                              <span aria-hidden="true">✓</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formErrors.city && (
                    <small className="field-error">{formErrors.city}</small>
                  )}
                </label>
                <label>
                  <span className="field-label">
                    Ghi chú đơn hàng{" "}
                    <span className="optional">(tuỳ chọn)</span>
                  </span>
                  <input
                    name="note"
                    type="text"
                    placeholder="Ví dụ: Giao giờ hành chính"
                    maxLength={200}
                    aria-invalid={Boolean(formErrors.note)}
                    className={formErrors.note ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("note", event.target.value)
                    }
                  />
                  {formErrors.note && (
                    <small className="field-error">{formErrors.note}</small>
                  )}
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
                  className={`payment-method ${paymentMethod === "vnpay" ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="vnpay"
                    checked={paymentMethod === "vnpay"}
                    onChange={() => setPaymentMethod("vnpay")}
                  />
                  <span className="method-icon" aria-hidden="true">
                    ↗
                  </span>
                  <span className="method-copy">
                    <strong>VNPay</strong>
                    <small>Thanh toán qua thẻ hoặc ứng dụng ngân hàng.</small>
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
                <Link href="/4TrangGioHang">Chỉnh sửa</Link>
              </div>

              <div className="summary-items">
                {orderItems.map((item) => (
                  <div className="summary-item" key={item.id}>
                    <div className="summary-item-image" aria-hidden="true">
                      ☕
                    </div>
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

              <button type="submit" className="payment-submit">
                Đặt hàng · {formatPrice(total)}
                <span aria-hidden="true">→</span>
              </button>
              {paymentError && (
                <p className="payment-api-error" role="alert">
                  {paymentError}
                </p>
              )}
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
