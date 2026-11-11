"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import "../thanh-toan.css";
import "./sandbox.css";

type CheckoutData = {
  orderId: string;
  internalOrderId?: number;
  totalAmount: number;
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
  const [processing, setProcessing] = useState(false);
  const [vnpayLoading, setVnpayLoading] = useState(false);
  const [error, setError] = useState("");
  const [vnpayReturning, setVnpayReturning] = useState(false);

  const autoProcessed = useRef(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      const raw = localStorage.getItem("brewlite_checkout");
      if (!raw) return;

      let parsed: CheckoutData;
      try {
        parsed = JSON.parse(raw) as CheckoutData;
      } catch {
        setError("Không thể đọc thông tin đơn hàng.");
        return;
      }

      const vnpStatus = searchParams.get("status");
      const urlOrderId = searchParams.get("orderId");

      if (vnpStatus) {
        // Redirect về từ VNPay sandbox
        if (!parsed.internalOrderId) {
          setError("Không tìm thấy đơn hàng trong phiên. Vui lòng quay lại trang thanh toán.");
          return;
        }
        setVnpayReturning(true);
        setCheckout(parsed);

        if (!autoProcessed.current) {
          autoProcessed.current = true;
          void completeMockPaymentWith(
            parsed,
            vnpStatus === "success" ? "SUCCESS" : "FAILURE",
          );
        }
      } else if (parsed.orderId === urlOrderId) {
        setCheckout(parsed);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function completeMockPaymentWith(
    checkoutData: CheckoutData,
    mockResult: "SUCCESS" | "FAILURE",
  ) {
    if (!checkoutData.internalOrderId) return;

    const token = localStorage.getItem("brewlite_accessToken");
    if (!token) {
      setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      setVnpayReturning(false);
      return;
    }

    setProcessing(true);
    setError("");

    const storageKey = `brewlite-payment-${checkoutData.orderId}`;
    let idempotencyKey = localStorage.getItem(storageKey);
    if (!idempotencyKey) {
      idempotencyKey = `brewlite-vnpay-${crypto.randomUUID()}`;
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
          madonhang: checkoutData.internalOrderId,
          phuongthuc: "BANKING",
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
        ...checkoutData,
        status: mockResult === "SUCCESS" ? "PAID" : "PAYMENT_FAILED",
        paymentStatus:
          typeof record.paymentStatus === "string"
            ? record.paymentStatus
            : mockResult === "SUCCESS"
              ? "DA_THANH_TOAN"
              : "THAT_BAI",
      };

      localStorage.setItem("brewlite_checkout", JSON.stringify(updatedCheckout));
      localStorage.removeItem(storageKey);

      if (mockResult === "SUCCESS") {
        localStorage.setItem("brewlite_cart", "[]");
        window.dispatchEvent(new Event("brewlite-cart-updated"));
        router.push(
          `/5TrangXacNhanDonHang?orderId=${encodeURIComponent(checkoutData.orderId)}`,
        );
      } else {
        // Thanh toán thất bại — quay lại trang thanh toán
        router.push(
          `/4TrangThanhToan?orderId=${encodeURIComponent(checkoutData.orderId)}&status=failure`,
        );
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Không thể xử lý thanh toán.",
      );
      setVnpayReturning(false);
    } finally {
      setProcessing(false);
    }
  }

  async function handleVnpayPayment() {
    if (!checkout?.internalOrderId || vnpayLoading) return;
    setVnpayLoading(true);
    setError("");

    // Lưu idempotency key TRƯỚC khi redirect sang VNPay
    const storageKey = `brewlite-payment-${checkout.orderId}`;
    if (!localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, `brewlite-vnpay-${crypto.randomUUID()}`);
    }

    try {
      const response = await fetch(`${API_URL}/payments/vnpay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(checkout.totalAmount),
          orderInfo: `Thanh toan don hang ${checkout.orderId}`,
        }),
      });

      const data: unknown = await response.json();
      const record = isApiRecord(data) ? data : {};

      if (!response.ok) {
        throw new Error(
          typeof record.message === "string"
            ? record.message
            : "Không thể tạo link thanh toán VNPay.",
        );
      }

      const paymentUrl =
        typeof record.paymentUrl === "string" ? record.paymentUrl : "";
      if (!paymentUrl) {
        throw new Error("Không nhận được link thanh toán từ VNPay.");
      }

      window.location.href = paymentUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể kết nối cổng VNPay Sandbox.",
      );
      setVnpayLoading(false);
    }
  }

  // Màn hình loading khi đang xử lý kết quả trả về từ VNPay
  if (vnpayReturning && processing) {
    return (
      <main className="payment-page">
        <div className="container sandbox-container">
          <section className="sandbox-card sandbox-processing">
            <div className="sandbox-processing-icon">⏳</div>
            <h2>Đang xử lý kết quả VNPay...</h2>
            <p>Vui lòng chờ trong giây lát.</p>
          </section>
        </div>
      </main>
    );
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
          <strong>Cổng thanh toán</strong>
        </div>

        <section className="sandbox-card">

          {/* Header thương hiệu */}
          <div className="sandbox-brand">
            <span className="sandbox-logo">🛒</span>
            <div>
              <span className="payment-eyebrow">BREWLITE CHECKOUT</span>
              <h1>Cổng thanh toán</h1>
            </div>
          </div>

          {/* Thông báo đây là môi trường demo / đồ án */}
          <div className="sandbox-notice">
            <div className="sandbox-notice-icon">🎓</div>
            <div className="sandbox-notice-body">
              <strong>Đây là đồ án mô phỏng thanh toán</strong>
              <p>
                Hệ thống sử dụng <b>Mock Payment</b> tích hợp cổng{" "}
                <b>VNPay Sandbox</b> — không phát sinh giao dịch tiền thật.
                Toàn bộ luồng thanh toán chỉ mang tính minh hoạ cho mục đích học tập.
              </p>
            </div>
          </div>

          {/* Thông tin đơn hàng */}
          <div className="sandbox-order">
            <span>Đơn hàng #{checkout.orderId}</span>
            <strong>{formatPrice(checkout.totalAmount)}</strong>
          </div>

          {/* Nút VNPay Sandbox */}
          <div className="sandbox-vnpay-section">
            <div className="sandbox-vnpay-header">
              <span className="sandbox-vnpay-logo">VNPay</span>
              <div>
                <strong>Thanh toán qua VNPay Sandbox</strong>
                <small>
                  Nhập thẻ test do VNPay cấp để mô phỏng giao dịch thực tế
                </small>
              </div>
            </div>

            {error && (
              <p className="payment-error" role="alert" style={{ marginBottom: 12 }}>
                {error}
              </p>
            )}

            <button
              type="button"
              className="sandbox-vnpay-btn"
              disabled={vnpayLoading || processing}
              onClick={handleVnpayPayment}
            >
              {vnpayLoading ? (
                <>Đang chuyển hướng đến VNPay...</>
              ) : (
                <>
                  <span className="sandbox-vnpay-btn-icon">🔗</span>
                  Thanh toán qua VNPay Sandbox
                </>
              )}
            </button>

            <p className="sandbox-vnpay-hint">
              Sau khi thanh toán trên trang VNPay, bạn sẽ được tự động chuyển về
              và đơn hàng sẽ được cập nhật tương ứng.
            </p>
          </div>

          <div style={{ textAlign: "center", marginTop: 18 }}>
            <Link
              href={`/4TrangThanhToan?orderId=${encodeURIComponent(checkout.orderId)}`}
              style={{
                color: "var(--muted)",
                fontSize: 13,
                textDecoration: "underline",
              }}
            >
              ← Quay lại chỉnh sửa thông tin đơn hàng
            </Link>
          </div>

          <p className="secure-note" style={{ marginTop: 20 }}>
            🔒 Môi trường Sandbox — không phát sinh giao dịch tiền thật
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
