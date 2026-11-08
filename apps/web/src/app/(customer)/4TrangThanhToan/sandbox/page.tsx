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
                  placeholder="9704 0000 0000 0000"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />
              </label>
              <div className="sandbox-field-row">
                <label>
                  Hết hạn
                  <input
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(event) => setExpiry(event.target.value)}
                  />
                </label>
                <label>
                  CVV
                  <input
                    inputMode="numeric"
                    placeholder="•••"
                    value={cvv}
                    onChange={(event) => setCvv(event.target.value)}
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
              onClick={() => completePayment("FAILURE")}
            >
              Hủy giao dịch
            </button>
            <button
              type="button"
              className="payment-submit"
              disabled={processing}
              onClick={() => completePayment("SUCCESS")}
            >
              {processing ? "Đang xử lý..." : "Thanh toán"}
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