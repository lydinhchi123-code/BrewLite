"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./xac-nhan.css";

/**
 * Trang 5 – chỉ HIỂN THỊ thông tin đơn hàng sau bước thanh toán.
 * Không tạo đơn, không gọi POST /payments và không tự cập nhật trạng thái.
 * API: GET /orders/:orderId (JWT) từ backend xác nhận đơn hàng.
 * URL: /5TrangXacNhanDonHang?orderId=ORD-xxxxxxxxxxxxx
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");

interface OrderItem {
  name: string;
  size: string | null;
  options: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface OrderDetail {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  createdAt: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryAddress: string | null;
  province: string | null;
  note: string | null;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
}

type PageState =
  | { kind: "loading" }
  | { kind: "missing-id" }
  | { kind: "login-required" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "ready"; order: OrderDetail; isPreview: boolean };

type PaymentView = "paid" | "pending" | "failed" | "refunded" | "unknown";

const formatPrice = (value: number) =>
  `${new Intl.NumberFormat("vi-VN").format(value)}đ`;

function getPaymentView(status: string): PaymentView {
  switch (status.toUpperCase()) {
    case "DA_THANH_TOAN":
    case "PAID":
      return "paid";
    case "CHO_THANH_TOAN":
    case "PENDING":
      return "pending";
    case "THAT_BAI":
    case "PAYMENT_FAILED":
      return "failed";
    case "DA_HOAN":
    case "REFUNDED":
      return "refunded";
    default:
      return "unknown";
  }
}

function paymentMethodLabel(method: string | null) {
  switch (method?.toUpperCase()) {
    case "MOMO":
      return "Ví MoMo";
    case "BANKING":
      return "Chuyển khoản";
    case "COD":
      return "Thanh toán khi nhận hàng";
    default:
      return "Chưa cập nhật";
  }
}

function itemOptions(item: OrderItem) {
  const extras = (item.options ?? "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value && !/^size\s*:/i.test(value));
  return [item.size ? `Size ${item.size}` : null, ...extras]
    .filter(Boolean)
    .join(" · ");
}

// Không tin dữ liệu localStorage hay query param để quyết định PAID.
// Toàn bộ dữ liệu hiển thị được lấy từ GET /orders/:orderId đã xác thực.

function toOrderDetail(
  data: unknown,
  requestedId: string,
): OrderDetail | null {
  if (!data || typeof data !== "object") return null;

  const response = data as Record<string, unknown>;

  // Hỗ trợ API trả dữ liệu trực tiếp hoặc bọc trong thuộc tính data.
  const value =
    response.data && typeof response.data === "object"
      ? (response.data as Record<string, unknown>)
      : response;

  // Chỉ chấp nhận đúng đơn hàng được yêu cầu.
  if (
    String(value.orderId ?? "") !== requestedId ||
    !Array.isArray(value.items)
  ) {
    return null;
  }

  const asMoney = (input: unknown): number | null => {
    const number =
      typeof input === "string" || typeof input === "number"
        ? Number(input)
        : NaN;

    return Number.isFinite(number) && number >= 0 ? number : null;
  };

  const totalAmount = asMoney(value.totalAmount);

  if (totalAmount === null) return null;

  const items: OrderItem[] = [];

  for (const raw of value.items) {
    if (!raw || typeof raw !== "object") return null;

    const row = raw as Record<string, unknown>;
    const price = asMoney(row.price);
    const quantity = Number(row.quantity);

    if (
      typeof row.name !== "string" ||
      price === null ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1
    ) {
      return null;
    }

    // Nếu API không trả lineTotal, tính từ giá và số lượng.
    const lineTotal =
      asMoney(row.lineTotal) ?? price * quantity;

    items.push({
      name: row.name,
      size: typeof row.size === "string" ? row.size : null,
      options:
        typeof row.options === "string" ? row.options : null,
      quantity,
      price,
      lineTotal,
    });
  }

  return {
    orderId: requestedId,
    orderStatus:
      typeof value.orderStatus === "string"
        ? value.orderStatus
        : "",
    paymentStatus:
      typeof value.paymentStatus === "string"
        ? value.paymentStatus
        : "",
    paymentMethod:
      typeof value.paymentMethod === "string"
        ? value.paymentMethod
        : null,
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : null,
    recipientName:
      typeof value.recipientName === "string"
        ? value.recipientName
        : typeof value.hotennguoinhan === "string"
          ? value.hotennguoinhan
          : null,
    recipientPhone:
      typeof value.recipientPhone === "string"
        ? value.recipientPhone
        : typeof value.sodienthoainguoinhan === "string"
          ? value.sodienthoainguoinhan
          : null,
    deliveryAddress:
      typeof value.deliveryAddress === "string"
        ? value.deliveryAddress
        : typeof value.diachigiaohang === "string"
          ? value.diachigiaohang
          : null,
    province:
      typeof value.province === "string"
        ? value.province
        : typeof value.phuong === "string"
          ? value.phuong
          : null,
    note:
      typeof value.note === "string"
        ? value.note
        : typeof value.ghichu === "string"
          ? value.ghichu
          : null,
    items,
    subtotal:
      asMoney(value.subtotal) ??
      items.reduce((sum, item) => sum + item.lineTotal, 0),
    deliveryFee: asMoney(value.deliveryFee) ?? 0,
    discount: asMoney(value.discount) ?? 0,
    totalAmount,
  };
}

/** Preview chỉ dành cho npm run dev, không gọi API và có nhãn dữ liệu minh họa. */
const previewOrder: OrderDetail = {
  orderId: "ORD-1060",
  orderStatus: "DA_TIEP_NHAN",
  paymentStatus: "DA_THANH_TOAN",
  paymentMethod: "MOMO",
  createdAt: "2026-11-10T20:00:00Z",
  recipientName: "Nguyễn Văn A",
  recipientPhone: "0901234567",
  deliveryAddress: "123 Nguyễn Thị Minh Khai, Phường Bến Thành, TP. Hồ Chí Minh",
  province: "Phường Bến Thành",
  note: "Giao đồ uống trước 10h sáng",
  items: [{ name: "Cà phê sữa", size: "M", options: "Size: M", quantity: 1, price: 40000, lineTotal: 40000 }],
  subtotal: 40000,
  deliveryFee: 0,
  discount: 0,
  totalAmount: 40000,
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 32 32" width="35" height="35" fill="none" aria-hidden="true">
      <path d="m7 16 6 6L25 10" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoffeeIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8h12v7a6 6 0 0 1-12 0V8ZM17 10h2a3 3 0 0 1 0 6h-2M7 3v2M12 3v2M3 21h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProgressSteps({ completed }: { completed: boolean }) {
  return (
    <nav className="confirm-stepper" aria-label="Tiến trình đặt hàng">
      <div className="confirm-step is-done">
        <span className="confirm-step-icon" aria-hidden="true">✓</span>
        <span>Giỏ hàng</span>
      </div>
      <span className="confirm-step-line" aria-hidden="true" />
      <div className="confirm-step is-done">
        <span className="confirm-step-icon" aria-hidden="true">✓</span>
        <span>Thanh toán</span>
      </div>
      <span className="confirm-step-line" aria-hidden="true" />
      <div className={`confirm-step ${completed ? "is-done" : "is-active"}`} aria-current="step">
        <span className="confirm-step-icon" aria-hidden="true">3</span>
        <span>Hoàn tất</span>
      </div>
    </nav>
  );
}

function EmptyState({
  heading,
  description,
  retry,
}: {
  heading: string;
  description: string;
  retry?: () => void;
}) {
  return (
    <section className="confirm-empty" role="status">
      <span className="confirm-empty-symbol" aria-hidden="true">!</span>
      <h1>{heading}</h1>
      <p>{description}</p>
      <div className="confirm-actions">
        {retry && <button type="button" className="confirm-btn confirm-btn-primary" onClick={retry}>Thử lại</button>}
        <Link href="/6TrangLichSuDonHang" className="confirm-btn confirm-btn-primary">Xem lịch sử đơn hàng</Link>
        <Link href="/" className="confirm-btn confirm-btn-outline">Về trang chủ</Link>
      </div>
    </section>
  );
}

export default function XacNhanDonHangPage() {
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    Promise.resolve().then(async () => {
      if (!active) return;

      const params = new URLSearchParams(window.location.search);

      if (
        process.env.NODE_ENV === "development" &&
        params.get("demo") === "1"
      ) {
        setPageState({
          kind: "ready",
          order: previewOrder,
          isPreview: true,
        });
        return;
      }

      const orderId = params.get("orderId")?.trim() ?? "";

      if (!orderId || !/^[A-Za-z0-9_-]{1,30}$/.test(orderId)) {
        setPageState({ kind: "missing-id" });
        return;
      }

      const token = localStorage.getItem("brewlite_accessToken");

      if (!token) {
        setPageState({ kind: "login-required" });
        return;
      }

      const requestController = new AbortController();
      controller = requestController;

      async function loadOrder() {
        try {
          const response = await fetch(
            `${API_URL}/orders/${encodeURIComponent(orderId)}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
              signal: requestController.signal,
            },
          );

          if (!active) return;

          if (response.status === 401 || response.status === 403) {
            setPageState({ kind: "login-required" });
            return;
          }

          if (response.status === 404) {
            setPageState({ kind: "not-found" });
            return;
          }

          if (!response.ok) {
            throw new Error(
              `Máy chủ trả về lỗi HTTP ${response.status}.`,
            );
          }

          const raw: unknown = await response.json();

          if (!active) return;

          const order = toOrderDetail(raw, orderId);

          if (!order) {
            throw new Error(
              "Dữ liệu đơn hàng trả về không đúng định dạng.",
            );
          }

          setPageState({
            kind: "ready",
            order,
            isPreview: false,
          });
        } catch (error) {
          if (!active || requestController.signal.aborted) return;

          setPageState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Không thể kết nối máy chủ.",
          });
        }
      }

      await loadOrder();
    });

    return () => {
      active = false;
      controller?.abort();
    };
  }, [attempt]);

  const retry = () => {
    setPageState({ kind: "loading" });
    setAttempt((value) => value + 1);
  };

  if (pageState.kind === "loading") {
    return (
      <main className="confirm-page">
        <div className="confirm-shell">
          <ProgressSteps completed={false} />
          <div className="confirm-loader" role="status" aria-live="polite">
            <span className="confirm-spinner" aria-hidden="true" />
            <p>Đang tải thông tin đơn hàng...</p>
          </div>
        </div>
      </main>
    );
  }

  if (pageState.kind !== "ready") {
    const details = {
      "missing-id": {
        heading: "Chưa có mã đơn hàng",
        description: "Bạn cần hoàn tất bước đặt hàng và truy cập trang xác nhận qua đường dẫn có mã đơn hàng.",
      },
      "login-required": {
        heading: "Vui lòng đăng nhập",
        description: "Để bảo vệ thông tin đơn hàng, hãy đăng nhập bằng biểu tượng tài khoản ở đầu trang rồi tải lại trang này.",
      },
      "not-found": {
        heading: "Không tìm thấy đơn hàng",
        description: "Mã đơn không tồn tại hoặc không thuộc tài khoản đang đăng nhập. Vui lòng kiểm tra lại mã đơn.",
      },
      error: {
        heading: "Không thể tải đơn hàng",
        description: `${pageState.kind === "error" ? pageState.message : ""} Vui lòng thử lại sau khi kiểm tra kết nối backend.`,
      },
    }[pageState.kind];
    return (
      <main className="confirm-page">
        <div className="confirm-shell">
          <ProgressSteps completed={false} />
          <EmptyState {...details} retry={pageState.kind === "error" || pageState.kind === "login-required" ? retry : undefined} />
        </div>
      </main>
    );
  }

  const { order, isPreview } = pageState;
  const view = getPaymentView(order.paymentStatus);
  const isPaid = view === "paid";
  const stateText = {
    paid: { eyebrow: "THANH TOÁN HOÀN TẤT", title: "Đặt hàng thành công!", subtitle: "Cảm ơn bạn đã lựa chọn BrewLite. Đơn hàng của bạn đã được xác nhận thanh toán.", label: "Đã thanh toán", note: "Vui lòng giữ mã đơn để đối chiếu khi nhận đồ uống." },
    pending: { eyebrow: "ĐANG CHỜ THANH TOÁN", title: "Đơn hàng đang chờ xử lý", subtitle: "BrewLite đã ghi nhận đơn hàng. Kết quả thanh toán hiện chưa được xác nhận.", label: "Chờ thanh toán", note: "Đơn hàng chưa được xác nhận thanh toán. Vui lòng kiểm tra lại trạng thái sau." },
    failed: { eyebrow: "THANH TOÁN CHƯA THÀNH CÔNG", title: "Thanh toán thất bại", subtitle: "Đơn hàng đã được tạo nhưng thanh toán chưa hoàn tất.", label: "Thanh toán thất bại", note: "Vui lòng quay lại bước thanh toán hoặc liên hệ cửa hàng để được hỗ trợ." },
    refunded: { eyebrow: "THANH TOÁN ĐÃ HOÀN", title: "Đơn hàng đã hoàn tiền", subtitle: "Giao dịch thanh toán của đơn hàng này đã được hoàn lại.", label: "Đã hoàn tiền", note: "Vui lòng kiểm tra thông tin hoàn tiền với đơn vị thanh toán." },
    unknown: { eyebrow: "THÔNG TIN ĐƠN HÀNG", title: "Đã nhận thông tin đơn hàng", subtitle: "Trạng thái thanh toán chưa được hệ thống xác định. Vui lòng kiểm tra lại sau.", label: "Chưa xác định", note: "Chưa thể xác nhận thanh toán thành công cho đơn hàng này." },
  }[view];

  return (
    <main className="confirm-page">
      <div className="confirm-shell">
        <ProgressSteps completed={isPaid} />
        {isPreview && <div className="confirm-preview" role="note">CHẾ ĐỘ DEMO – Dữ liệu minh họa, không phải đơn hàng thật</div>}

        <header className="confirm-hero">
          <div className={`confirm-status-icon confirm-status-${view}`} aria-hidden="true">
            {isPaid ? <CheckIcon /> : view === "failed" ? "×" : view === "refunded" ? "↩" : "!"}
          </div>
          <p className="confirm-eyebrow"><span />{stateText.eyebrow}<span /></p>
          <h1>{stateText.title}</h1>
          <p className="confirm-subtitle">{stateText.subtitle}</p>
        </header>

        <section className="confirm-summary-card" aria-label="Mã đơn hàng và trạng thái thanh toán">
          <div className="confirm-summary-field">
            <span>Mã đơn hàng</span>
            <strong>#{order.orderId}</strong>
          </div>
          <div className="confirm-summary-divider" aria-hidden="true" />
          <div className="confirm-summary-field">
            <span>Trạng thái</span>
            <strong className={`confirm-payment-label confirm-payment-${view}`}>
              {order.paymentStatus || "CHƯA CẬP NHẬT"} · {stateText.label}
            </strong>
          </div>
        </section>

        {/* Thông tin người nhận và giao hàng */}
        <section className="confirm-delivery-card" aria-labelledby="confirm-delivery-title">
          <div className="confirm-card-heading">
            <h2 id="confirm-delivery-title">Thông tin giao nhận</h2>
            <span>📍 Giao tận nơi</span>
          </div>

          <div className="confirm-delivery-grid">
            <div className="confirm-delivery-field">
              <span className="confirm-field-label">Người nhận:</span>
              <strong className="confirm-field-value">{order.recipientName || "Khách hàng"}</strong>
            </div>

            <div className="confirm-delivery-field">
              <span className="confirm-field-label">Số điện thoại:</span>
              <strong className="confirm-field-value">{order.recipientPhone || "Chưa cập nhật"}</strong>
            </div>

            <div className="confirm-delivery-field full-width">
              <span className="confirm-field-label">Địa chỉ giao hàng:</span>
              <strong className="confirm-field-value">
                {order.deliveryAddress || "Chưa cập nhật"}
                {order.province && !order.deliveryAddress?.includes(order.province) ? `, ${order.province}` : ""}
              </strong>
            </div>

            {order.note && (
              <div className="confirm-delivery-field full-width">
                <span className="confirm-field-label">Ghi chú:</span>
                <span className="confirm-field-note">"{order.note}"</span>
              </div>
            )}

            <div className="confirm-delivery-field">
              <span className="confirm-field-label">Thời gian đặt:</span>
              <span className="confirm-field-value">
                {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : "Hôm nay"}
              </span>
            </div>

            <div className="confirm-delivery-field">
              <span className="confirm-field-label">Hình thức thanh toán:</span>
              <strong className="confirm-field-value">{paymentMethodLabel(order.paymentMethod)}</strong>
            </div>
          </div>
        </section>

        <section className="confirm-detail-card" aria-labelledby="confirm-items-title">
          <div className="confirm-card-heading">
            <h2 id="confirm-items-title">Thông tin đơn hàng</h2>
            <span>{paymentMethodLabel(order.paymentMethod)}</span>
          </div>
          <div className="confirm-items">
            {order.items.length > 0 ? order.items.map((item, index) => (
              <div className="confirm-item" key={`${item.name}-${index}`}>
                <div className="confirm-item-content">
                  <span className="confirm-item-quantity">{item.quantity}×</span>
                  <div>
                    <strong>{item.name}</strong>
                    {itemOptions(item) && <small>{itemOptions(item)}</small>}
                  </div>
                </div>
                <strong className="confirm-item-total">{formatPrice(item.lineTotal)}</strong>
              </div>
            )) : <p className="confirm-no-items">Đơn hàng hiện chưa có thông tin sản phẩm.</p>}
          </div>

          {(order.deliveryFee > 0 || order.discount > 0) && (
            <div className="confirm-fee-lines">
              <div><span>Tạm tính</span><strong>{formatPrice(order.subtotal)}</strong></div>
              {order.deliveryFee > 0 && <div><span>Phí giao hàng</span><strong>{formatPrice(order.deliveryFee)}</strong></div>}
              {order.discount > 0 && <div><span>Giảm giá</span><strong>−{formatPrice(order.discount)}</strong></div>}
            </div>
          )}
          <div className="confirm-grand-total">
            <span>{isPaid ? "Đã thanh toán" : "Tổng đơn hàng"}</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>
        </section>

        <aside className={`confirm-hint ${isPaid ? "" : "confirm-hint-muted"}`}>
          <span className="confirm-hint-icon"><CoffeeIcon /></span>
          <div>
            <strong>{isPaid ? "Vui lòng giữ mã đơn để nhận đồ uống" : "Thông tin thanh toán"}</strong>
            <p>{stateText.note} Mã đơn #{order.orderId}.</p>
          </div>
        </aside>

        <div className="confirm-actions">
          <Link href="/6TrangLichSuDonHang" className="confirm-btn confirm-btn-primary">Xem lịch sử đơn hàng</Link>
          <Link href="/" className="confirm-btn confirm-btn-outline">Quay về trang chủ</Link>
        </div>
      </div>
    </main>
  );
}