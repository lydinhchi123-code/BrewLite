"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const statuses = [
  "Tất cả trạng thái",
  "PENDING",
  "PAID",
  "PREPARING",
  "READY",
  "COMPLETED",
  "PAYMENT_FAILED",
  "CANCELLED",
];

const statusLabels: Record<string, string> = {
  PENDING: "Tiếp nhận đơn",
  PAID: "Đã thanh toán",
  PREPARING: "Đang chuẩn bị",
  READY: "Nước đã sẵn sàng",
  COMPLETED: "Hoàn thành",
  PAYMENT_FAILED: "Thanh toán thất bại",
  CANCELLED: "Đã hủy",
};

const nextStatuses: Record<string, string[]> = {
  PENDING: ["PAID"],
  PAID: ["PREPARING"],
  PREPARING: ["READY"],
  READY: ["COMPLETED"],
  COMPLETED: [],
  PAYMENT_FAILED: [],
  CANCELLED: [],
};

type OrderItem = {
  mactdh?: number;
  tenmon?: string;
  image_url?: string;
  kichco?: string;
  duong?: string;
  da?: string;
  topping?: string;
  soluong?: number;
  dongia?: number;
  thanhtien?: number;
  [key: string]: unknown;
};

type Order = {
  madonhang: number | string;
  displayId: string;
  customer: string;
  phone: string;
  date: string;
  total: number;
  status: string;
  items: OrderItem[];
  raw: Record<string, unknown>;
};

function getValue(
  data: Record<string, unknown>,
  keys: string[],
  fallback: unknown = ""
) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      return data[key];
    }
  }

  return fallback;
}

function normalizeOrder(data: Record<string, unknown>): Order {
  const id = getValue(data, ["madonhang"], "—");
  const rawItems = getValue(data, ["items"], []);

  return {
    madonhang: id as number | string,

    displayId: String(
      getValue(data, ["madonhanghienthi"], `ORD-${id}`)
    ),

    customer: String(
      getValue(data, ["hotennguoinhan"], "Chưa có thông tin")
    ),

    phone: String(
      getValue(data, ["sodienthoainguoinhan"], "—")
    ),

    date: String(
      getValue(data, ["ngaydat"], "")
    ),

    total: Number(
      getValue(data, ["tongtien"], 0)
    ),

    status: String(
      getValue(data, ["trangthai"], "PENDING")
    ).toUpperCase(),

    items: Array.isArray(rawItems)
      ? rawItems as OrderItem[]
      : [],

    raw: data,
  };
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN");
}

function formatMoney(value: number) {
  return value.toLocaleString("vi-VN") + "₫";
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Tất cả trạng thái");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<Record<string, string>>({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/orders`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Không tải được đơn hàng (HTTP ${response.status})`);
      }

      const payload = await response.json();

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : [];

      const normalized = list.map((item: Record<string, unknown>) =>
        normalizeOrder(item)
      );

      setOrders(normalized);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể tải danh sách đơn hàng."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = orders.filter((order) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
        String(order.madonhang).toLowerCase().includes(keyword) ||
        order.displayId.toLowerCase().includes(keyword) ||
        order.customer.toLowerCase().includes(keyword) ||
        order.phone.toLowerCase().includes(keyword);

    const matchesStatus =
      status === "Tất cả trạng thái" || order.status === status;

    return matchesSearch && matchesStatus;
  });

  const updateStatus = async (order: Order) => {
    const newStatus = nextStatus[String(order.madonhang)];

    if (!newStatus || !nextStatuses[order.status]?.includes(newStatus)) {
      setError("Trạng thái được chọn không hợp lệ.");
      return;
    }

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setError("Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.");
      return;
    }

    const id = String(order.madonhang);

    setUpdatingId(id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/orders/${order.madonhang}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Cập nhật thất bại (HTTP ${response.status})`);
      }

      setOrders((previous) =>
        previous.map((item) =>
          String(item.madonhang) === id
            ? { ...item, status: newStatus }
            : item
        )
      );

      setNextStatus((previous) => ({
        ...previous,
        [id]: "",
      }));

      setSuccess(`Đã cập nhật đơn #${id}: ${statusLabels[newStatus] ?? newStatus}.`);

      setSelectedOrder((previous) =>
        previous && String(previous.madonhang) === id
          ? { ...previous, status: newStatus }
          : previous
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể cập nhật trạng thái."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Quản lý đơn hàng</h1>
          <p>
            Theo dõi đơn đặt hàng và quản lý tiến trình phục vụ khách hàng.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={() => void loadOrders()}
          disabled={loading}
        >
          ↻ Làm mới dữ liệu
        </button>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <div className="admin-stat-label">Tổng đơn hàng</div>
          <div className="admin-stat-value">{orders.length}</div>
          <div className="admin-stat-note">Đơn hàng trong hệ thống</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-label">Chờ xác nhận</div>
          <div className="admin-stat-value">
            {orders.filter((o) => o.status === "PENDING").length}
          </div>
          <div className="admin-stat-note">Đơn cần xử lý</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-label">Đang xử lý</div>
          <div className="admin-stat-value">
            {orders.filter((o) =>
              ["PAID", "PREPARING", "READY"].includes(o.status)
            ).length}
          </div>
          <div className="admin-stat-note">Đã thanh toán hoặc đang phục vụ</div>
        </article>
      </section>

      {error && <div className="admin-error">{error}</div>}

      {success && (
        <div className="admin-status" style={{ marginBottom: 18 }}>
          {success}
        </div>
      )}

      <div className="admin-toolbar">
        <input
          className="admin-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm mã đơn, tên hoặc số điện thoại..."
        />

        <select
          className="admin-select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {statuses.map((item) => (
            <option key={item} value={item}>
              {item === "Tất cả trạng thái"
                ? item
                : statusLabels[item] ?? item}
            </option>
          ))}
        </select>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Danh sách đơn hàng</h3>
          <span className="admin-muted" style={{ fontSize: 12 }}>
            {filteredOrders.length} đơn hàng
          </span>
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải đơn hàng...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>MÃ ĐƠN</th>
                  <th>KHÁCH HÀNG</th>
                  <th>SỐ ĐIỆN THOẠI</th>
                  <th>NGÀY ĐẶT</th>
                  <th>TỔNG TIỀN</th>
                  <th>TRẠNG THÁI</th>
                  <th>CẬP NHẬT</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => {
                  const id = String(order.madonhang);
                  const allowedStatuses = nextStatuses[order.status] ?? [];

                  return (
                    <tr key={id}>
                      <td><strong>{order.displayId}</strong></td>
                      <td>{order.customer}</td>
                      <td>{order.phone}</td>
                      <td>{formatDate(order.date)}</td>
                      <td>{formatMoney(order.total)}</td>
                      <td>
                        <span className="admin-status"
                          style={order.status === "PAYMENT_FAILED"
                              ? {
                                  backgroundColor: "#fee2e2",
                                  color: "#dc2626",
                                  border: "1px solid #fecaca",
                                }
                              : {}
                          }
                        >
                          {statusLabels[order.status] ?? order.status}
                        </span>
                      </td>
                      <td>
                        {allowedStatuses.length > 0 ? (
                          <div style={{ display: "grid", gap: 6, minWidth: 145 }}>
                            <select
                              className="admin-select"
                              value={nextStatus[id] ?? ""}
                              onChange={(e) =>
                                setNextStatus((previous) => ({
                                  ...previous,
                                  [id]: e.target.value,
                                }))
                              }
                            >
                              <option value="">Chọn trạng thái</option>
                              {allowedStatuses.map((value) => (
                                <option key={value} value={value}>
                                  {statusLabels[value] ?? value}
                                </option>
                              ))}
                            </select>

                            <button
                              className="admin-action-button"
                              disabled={
                                updatingId === id || !nextStatus[id]
                              }
                              onClick={() => void updateStatus(order)}
                            >
                              {updatingId === id ? "Đang lưu..." : "Cập nhật"}
                            </button>
                          </div>
                        ) : (
                          <span className="admin-muted">Đã kết thúc</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="admin-action-button"
                          onClick={() => setSelectedOrder(order)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="admin-empty">
                {orders.length === 0
                  ? "Chưa có đơn hàng trong hệ thống."
                  : "Không tìm thấy đơn hàng phù hợp."}
              </div>
            )}
          </div>
        )}
      </section>

      {selectedOrder && (
        <div
          onClick={() => setSelectedOrder(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <section
            className="admin-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div className="admin-panel-header">
              <h3>Chi tiết đơn {selectedOrder.displayId}</h3>
              <button
                className="admin-action-button"
                onClick={() => setSelectedOrder(null)}
              >
                Đóng
              </button>
            </div>

            <p><strong>Khách hàng:</strong> {selectedOrder.customer}</p>
            <p><strong>Số điện thoại:</strong> {selectedOrder.phone}</p>
            <p><strong>Ngày đặt:</strong> {formatDate(selectedOrder.date)}</p>
            <p>
              <strong>Trạng thái:</strong>{" "}
              {statusLabels[selectedOrder.status] ?? selectedOrder.status}
            </p>

            <h4>Danh sách món</h4>

            {selectedOrder.items.length === 0 ? (
              <div className="admin-empty">
                API chưa trả về danh sách món của đơn hàng này.
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>MÓN</th>
                      <th>TÙY CHỌN</th>
                      <th>SỐ LƯỢNG</th>
                      <th>ĐƠN GIÁ</th>
                      <th>THÀNH TIỀN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, index) => {
                      const options = [
                        item.kichco ? `Size: ${item.kichco}` : "",
                        item.duong ? `Đường: ${item.duong}` : "",
                        item.da ? `Đá: ${item.da}` : "",
                        item.topping ? `Topping: ${item.topping}` : "",
                      ].filter(Boolean);

                      return (
                        <tr key={String(item.mactdh ?? index)}>
                          <td>{String(item.tenmon ?? "Món uống")}</td>
                          <td>{options.join(", ") || "—"}</td>
                          <td>{Number(item.soluong ?? 0)}</td>
                          <td>{formatMoney(Number(item.dongia ?? 0))}</td>
                          <td>{formatMoney(Number(item.thanhtien ?? 0))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ textAlign: "right", marginTop: 18 }}>
              <strong>Tổng tiền: {formatMoney(selectedOrder.total)}</strong>
            </p>
          </section>
        </div>
      )}
    </>
  );
}