"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import "../thanh-toan.css";
import "./sandbox.css";

type PaymentMethod = "wallet" | "card";

type CheckoutData = {
  orderId: string;
  internalOrderId?: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
};

type ApiRecord = Record<string, unknown>;

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}₫`;

function isApiRecord(value: unknown): value is ApiRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function PaymentSandboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const queryMethod = searchParams.get("method");
  const method: PaymentMethod =
    queryMethod === "card" || queryMethod === "wallet"
      ? queryMethod
      : checkout?.paymentMethod ?? "wallet";
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<"success" | "failure" | null>(null);

  function handleCardNumberChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    const parts = digits.match(/.{1,4}/g);
    setCardNumber(parts ? parts.join(" ") : digits);
    if (error) setError("");
  }

  function handleExpiryChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) {
      setExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`);
    } else {
      setExpiry(digits);
    }
    if (error) setError("");
  }

  function handleCvvChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCvv(digits);
    if (error) setError("");
  }

  function validateCard(): string | null {
    const rawDigits = cardNumber.replace(/\D/g, "");
    if (!rawDigits) {
      return "Vui lòng nhập số thẻ ngân hàng.";
    }
    if (rawDigits.length !== 16) {
      return "Số thẻ ngân hàng phải gồm đúng 16 chữ số (ví dụ: 9704 0000 0000 0000).";
    }

    const cleanExpiry = expiry.trim();
    if (!cleanExpiry) {
      return "Vui lòng nhập ngày hết hạn của thẻ (MM/YY).";
    }
    const expiryMatch = cleanExpiry.match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/);
    if (!expiryMatch) {
      return "Ngày hết hạn không hợp lệ. Vui lòng nhập định dạng MM/YY (ví dụ: 12/28).";
    }
    const expMonth = parseInt(expiryMatch[1], 10);
    const expYear = parseInt(`20${expiryMatch[2]}`, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (
      expYear < currentYear ||
      (expYear === currentYear && expMonth < currentMonth)
    ) {
      return "Thẻ đã hết hạn sử dụng. Vui lòng kiểm tra lại.";
    }

    const cleanCvv = cvv.trim();
    if (!cleanCvv) {
      return "Vui lòng nhập mã bảo mật CVV.";
    }
    if (!/^\d{3,4}$/.test(cleanCvv)) {
      return "Mã CVV phải gồm 3 hoặc 4 chữ số.";
    }

    return null;
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      const raw = localStorage.getItem("brewlite_checkout");
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as CheckoutData;
        if (parsed.orderId === searchParams.get("orderId")) {
          setCheckout(parsed);
        }
      } catch {
        setError("Không thể đọc thông tin đơn hàng.");
      }
    });
  }, [searchParams]);

  async function completePayment(mockResult: "SUCCESS" | "FAILURE") {
    if (!checkout?.internalOrderId || processing) return;

    if (mockResult === "SUCCESS" && method === "card") {
      const cardError = validateCard();
      if (cardError) {
        setError(cardError);
        return;
      }
    }

    const token = localStorage.getItem("brewlite_accessToken");
    if (!token) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setProcessing(true);
    setError("");

    const storageKey = `brewlite-payment-${checkout.orderId}`;
    let idempotencyKey = localStorage.getItem(storageKey);

    if (!idempotencyKey) {
      idempotencyKey = `brewlite-${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, idempotencyKey);
    }

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          madonhang: checkout.internalOrderId,
          phuongthuc: method === "wallet" ? "MOMO" : "BANKING",
          mockResult,
        }),
      });
      const data: unknown = await response.json();
      const record = isApiRecord(data) ? data : {};

      if (!response.ok) {
        throw new Error(
          typeof record.message === "string"
            ? record.message
            : "Không thể xử lý thanh toán.",
        );
      }

      const updatedCheckout = {
        ...checkout,
        paymentMethod: method,
        status: mockResult === "SUCCESS" ? "PAID" : "PAYMENT_FAILED",
        paymentStatus:
          typeof record.paymentStatus === "string"
            ? record.paymentStatus
            : mockResult === "SUCCESS"
              ? "DA_THANH_TOAN"
              : "THAT_BAI",
      };

      localStorage.setItem(
        "brewlite_checkout",
        JSON.stringify(updatedCheckout),
      );
      localStorage.removeItem(storageKey);

      if (mockResult === "SUCCESS") {
        localStorage.setItem("brewlite_cart", "[]");
        window.dispatchEvent(new Event("brewlite-cart-updated"));
        router.push(
          `/5TrangXacNhanDonHang?orderId=${encodeURIComponent(
            checkout.orderId,
          )}`,
        );
      } else {
        setResult("failure");
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Không thể xử lý thanh toán.",
      );
    } finally {
      setProcessing(false);
    }
  }

  if (!checkout) {
    return (
      <main className="payment-page">
        <section className="payment-success container">
          <h1>Không tìm thấy giao dịch</h1>
          <p>Hãy quay lại trang thanh toán để tạo lại giao dịch.</p>
          <Link className="payment-button primary" href="/4TrangThanhToan">
            Quay lại thanh toán
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <div className="container sandbox-container">
        <div className="payment-breadcrumb">
          <Link href={`/4TrangThanhToan?orderId=${checkout.orderId}`}>
            Thanh toán
          </Link>
          <span aria-hidden="true">/</span>
          <strong>Cổng thanh toán mô phỏng</strong>
        </div>

        <section className="sandbox-card">
          <div className="sandbox-brand">
            <span className="sandbox-logo">{method === "wallet" ? "V" : "▣"}</span>
            <div>
              <span className="payment-eyebrow">BREWLITE SANDBOX</span>
              <h1>{method === "wallet" ? "Ví điện tử" : "Thẻ ngân hàng"}</h1>
            </div>
          </div>

          <div className="sandbox-order">
            <span>Đơn hàng #{checkout.orderId}</span>
            <strong>{formatPrice(checkout.totalAmount)}</strong>
          </div>

          {method === "wallet" ? (
            <div className="sandbox-wallet">
              <div className="sandbox-qr" aria-hidden="true">
                <span>BREW</span>
                <strong>QR</strong>
              </div>
              <p>Quét mã QR mô phỏng hoặc bấm xác nhận để hoàn tất giao dịch.</p>
            </div>
          ) : (
            <div className="sandbox-fields">
              <label>
                Số thẻ mô phỏng
                <input
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="9704 0000 0000 0000"
                  value={cardNumber}
                  onChange={(event) => handleCardNumberChange(event.target.value)}
                />
              </label>
              <div className="sandbox-field-row">
                <label>
                  Hết hạn (MM/YY)
                  <input
                    maxLength={5}
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(event) => handleExpiryChange(event.target.value)}
                  />
                </label>
                <label>
                  CVV
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="•••"
                    value={cvv}
                    onChange={(event) => handleCvvChange(event.target.value)}
                  />
                </label>
              </div>
              <small>Thông tin trên chỉ là dữ liệu mô phỏng, không được gửi đến ngân hàng.</small>
            </div>
          )}

          {result === "failure" && (
            <p className="sandbox-failure" role="alert">
              Giao dịch thất bại. Đơn hàng đã chuyển sang PAYMENT_FAILED.
            </p>
          )}
          {error && <p className="payment-error" role="alert">{error}</p>}

          <div className="sandbox-actions">
            <button
              type="button"
              className="sandbox-cancel"
              disabled={processing}
              onClick={() => {
                if (result === "failure") {
                  router.push(
                    `/4TrangThanhToan?orderId=${encodeURIComponent(
                      checkout.orderId,
                    )}`,
                  );
                } else {
                  void completePayment("FAILURE");
                }
              }}
            >
              {result === "failure" ? "Quay lại đơn hàng" : "Hủy giao dịch"}
            </button>
            <button
              type="button"
              className="payment-submit"
              disabled={processing}
              onClick={() => completePayment("SUCCESS")}
            >
              {processing
                ? "Đang xử lý..."
                : result === "failure"
                  ? "Thử lại thanh toán"
                  : "Thanh toán"}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <p className="secure-note">
            Đây là môi trường mô phỏng nội bộ, không phát sinh giao dịch tiền thật.
          </p>
        </section>
      </div>
    </main>
  );
}
export default function PaymentSandboxPage() {
  return (
    <Suspense
      fallback={
        <main className="payment-page">
          <div className="container">Đang tải cổng thanh toán...</div>
        </main>
      }
    >
      <PaymentSandboxContent />
    </Suspense>
  );
}