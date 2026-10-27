"use client";

import { useEffect, useState } from "react";
import "./lichsudon.css";

type TaiKhoan = {
  makh: number;
  hoten: string;
  email: string | null;
  sodienthoai: string;
  trangthai: number;
};

type OrderStatus = "Đang xử lý" | "Hoàn thành" | "Đã hủy";

type OrderItem = {
  id: number;
  name: string;
  image: string;
  size: string;
  sugar: string;
  ice: string;
  toppings: string[];
  quantity: number;
  price: number;
};

type Order = {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  totalAmount: number;
};

type ApiOrder = {
  madonhang: string | number;
  madonhanghienthi?: string;
  makh: string | number | null;
  ngaydat: string;
  trangthai: string;
  tongtien: number;
  tamtinh: number;
  phigiaohang: number;
  giamgia: number;
  items: ApiOrderItem[];
};

type ApiOrderItem = {
  mactdh: number;
  tenmon: string;
  image_url: string | null;
  kichco: string | null;
  duong: string | null;
  da: string | null;
  topping: string | null;
  soluong: number;
  dongia: number;
  thanhtien: number;
};

function mapOrderStatus(status: string): OrderStatus {
  const value = status.trim().toLowerCase().normalize("NFC").replace(/[\s-]+/g, "_");

  if (
    ["da_giao", "hoàn_thành", "hoan_thanh", 
      "completed", "complete", "delivered",
    ].includes(value)
  ) {
    return "Hoàn thành";
  }

  if (
    [
      "da_huy", "đã_hủy", "đã_huỷ",
      "canceled", "cancelled",
    ].includes(value)
  ) {
    return "Đã hủy";
  }

  return "Đang xử lý";
}

function mapApiOrder(order: ApiOrder): Order {
  const items = (order.items ?? []).map((item) => ({
    id: Number(item.mactdh),
    name: item.tenmon,
    image: item.image_url || "☕",
    size: item.kichco || "Mặc định",
    sugar: item.duong || "Chưa chọn",
    ice: item.da || "Chưa chọn",
    toppings: item.topping
      ? item.topping
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [],
    quantity: Number(item.soluong),
    price: Number(item.dongia),
  }));

  const subtotal = Number(
    order.tamtinh ??
      items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
  );

  const shippingFee = Number(order.phigiaohang ?? 0);
  const discount = Number(order.giamgia ?? 0);

  return {
    id: order.madonhanghienthi || String(order.madonhang),
    date: new Date(order.ngaydat).toLocaleString("vi-VN"),
    status: mapOrderStatus(order.trangthai),
    items,
    subtotal,
    shippingFee,
    discount,
    totalAmount: Number(order.tongtien),
  };
}

const filters = ["Tất cả", "Đang xử lý", "Hoàn thành", "Đã hủy"] as const;

type Filter = (typeof filters)[number];

function formatPrice(price: number) {
  return price.toLocaleString("vi-VN") + "đ";
}

function getOrderTotal(order: Order) {
  return order.totalAmount;
}

function getStatusClass(status: OrderStatus) {
  if (status === "Hoàn thành") return "status-success";
  if (status === "Đang xử lý") return "status-pending";
  return "status-cancelled";
}

function isImageSource(image: string) {
  return (
    image.startsWith("/") ||
    image.startsWith("https://") ||
    image.startsWith("http://")
  );
}

export default function OrderHistoryPage() {
  const [activeFilter, setActiveFilter] = useState<Filter>("Tất cả");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [taiKhoan, setTaiKhoan] = useState<TaiKhoan | null>(null);
  const [daKiemTra, setDaKiemTra] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [dangTaiDonHang, setDangTaiDonHang] = useState(false);
  const [loiDonHang, setLoiDonHang] = useState("");

  useEffect(() => {
    const duLieu = localStorage.getItem("brewlite_user");

    if (duLieu) {
      try {
        setTaiKhoan(JSON.parse(duLieu));
      } catch {
        localStorage.removeItem("brewlite_user");
      }
    }

    setDaKiemTra(true);
  }, []);

  useEffect(() => {
    if (!taiKhoan) return;

    const controller = new AbortController();

    async function taiLichSuDonHang() {
      setDangTaiDonHang(true);
      setLoiDonHang("");

      try {
        const response = await fetch(
          `http://localhost:3001/orders/khach-hang/${taiKhoan!.makh}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`Không thể tải đơn hàng (HTTP ${response.status})`);
        }

        const data: ApiOrder[] = await response.json();
        console.log(
          "Trạng thái đơn hàng từ backend:",
          data.map((order) => ({
            id: order.madonhanghienthi || order.madonhang,
            trangthai: order.trangthai,
          }))
        );

        setOrders(data.map(mapApiOrder));
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setLoiDonHang(
          error instanceof Error
            ? error.message
            : "Đã xảy ra lỗi khi tải đơn hàng.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setDangTaiDonHang(false);
        }
      }
    }

    taiLichSuDonHang();

    return () => controller.abort();
  }, [taiKhoan]);

  const visibleOrders = activeFilter === "Tất cả"
      ? orders : orders.filter((order) => order.status === activeFilter);

  function getCount(filter: Filter) {
    if (filter === "Tất cả") return orders.length;

    return orders.filter((order) => order.status === filter).length;
  }

  if (!daKiemTra) {
    return (
      <main className="history-page">
        <section className="history-container">
          <p>Đang kiểm tra thông tin tài khoản...</p>
        </section>
      </main>
    );
  }

  if (!taiKhoan) {
    return (
      <main className="history-page">
        <section className="history-container">
          <header className="history-header">
            <div>
              <p className="history-eyebrow">TÀI KHOẢN CỦA TÔI</p>
              <h1>Lịch sử đơn hàng</h1>
              <p className="history-subtitle">
                Bạn chưa đăng nhập. Vui lòng đăng nhập để xem lịch sử đơn hàng.
              </p>
            </div>
          </header>
        </section>
      </main>
    );
  }

  return (
    <main className="history-page">
      <section className="history-container">
        <header className="history-header">
          <div>
            <p className="history-eyebrow">TÀI KHOẢN CỦA TÔI</p>
            <h1>Lịch sử đơn hàng</h1>
            <p className="history-subtitle">
              Theo dõi và xem lại những món ngon bạn đã đặt tại BrewLite.
            </p>
            {/* <div className="customer-info">
              <p>Họ và tên: {taiKhoan.hoten}</p>
              <p>Email: {taiKhoan.email || "Chưa cập nhật"}</p>
              <p>Số điện thoại: {taiKhoan.sodienthoai}</p>
            </div> */}
          </div>

          <div className="history-summary">
            <strong>{orders.length}</strong>
            <span>đơn hàng</span>
          </div>
        </header>

        <nav className="history-filters" aria-label="Lọc đơn hàng">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`history-filter ${
                activeFilter === filter ? "is-active" : ""
              }`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter}
              <span>{getCount(filter)}</span>
            </button>
          ))}
        </nav>

        <section className="history-list" aria-label="Danh sách đơn hàng">
          {dangTaiDonHang ? (
            <div className="history-empty">
              <p>Đang tải lịch sử đơn hàng...</p>
            </div>
          ) : loiDonHang ? (
            <div className="history-empty">
              <h2>Không thể tải đơn hàng</h2>
              <p>{loiDonHang}</p>
              <button
                type="button"
                className="history-detail-button"
                onClick={() => setTaiKhoan({ ...taiKhoan! })}
              >
                Thử tải lại
              </button>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="history-empty">
              <span className="empty-icon">☕</span>
              <h2>Chưa có đơn hàng</h2>
              <p>Không tìm thấy đơn hàng nào thuộc trạng thái này.</p>
            </div>
          ) : (
            visibleOrders.map((order) => {
              if (order.items.length === 0) {
                return (
                  <article className="history-card" key={order.id}>
                    <h2>#{order.id}</h2>
                    <p>Đơn hàng chưa có thông tin chi tiết món.</p>
                    <p>Trạng thái: {order.status}</p>
                    <p>Tổng thanh toán: {formatPrice(order.totalAmount)}</p>
                  </article>
                );
              }

              const itemCount = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );

              return (
                <article className="history-card" key={order.id}>
                  <div className="history-card-header">
                    <div>
                      <p className="history-label">Mã đơn hàng</p>
                      <h2 className="history-order-id">#{order.id}</h2>
                    </div>

                    <span
                      className={`history-status ${getStatusClass(order.status)}`}
                    >
                      <span className="status-dot" />
                      {order.status}
                    </span>
                  </div>

                  <p className="history-date">{order.date}</p>

                  <div className="history-product">
                    <div className="history-product-icon">
                      {isImageSource(order.items[0].image) ? (
                        <img
                          src={order.items[0].image}
                          alt={order.items[0].name}
                          className="history-product-image"
                        />
                      ) : (
                        order.items[0].image
                      )}
                    </div>

                    <div className="history-product-info">
                      <p className="history-product-name">
                        {order.items[0].name}
                        {order.items.length > 1 &&
                          ` và ${order.items.length - 1} món khác`}
                      </p>
                      <p className="history-product-meta">
                        Số lượng: {itemCount}
                      </p>
                    </div>

                    <p className="history-product-price">
                      {formatPrice(
                        order.items.reduce(
                          (sum, item) => sum + item.price * item.quantity,
                          0,
                        ),
                      )}
                    </p>
                  </div>

                  <div className="history-card-footer">
                    <div>
                      <p className="history-total-label">Tổng thanh toán</p>
                      <p className="history-total-price">
                        {formatPrice(getOrderTotal(order))}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="history-detail-button"
                      onClick={() => setSelectedOrder(order)}
                      aria-label={`Xem chi tiết đơn hàng ${order.id}`}
                    >
                      Xem chi tiết <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </section>

      {selectedOrder && (
        <div
          className="history-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedOrder(null);
            }
          }}
        >
          <section
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
          >
            <header className="history-modal-header">
              <div>
                <p className="history-eyebrow">CHI TIẾT ĐƠN HÀNG</p>
                <h2 id="history-modal-title">#{selectedOrder.id}</h2>
                <p className="history-date">{selectedOrder.date}</p>
              </div>

              <button
                type="button"
                className="history-modal-close"
                onClick={() => setSelectedOrder(null)}
                aria-label="Đóng chi tiết"
              >
                ×
              </button>
            </header>

            <div className="history-modal-status">
              <span
                className={`history-status ${getStatusClass(selectedOrder.status)}`}
              >
                <span className="status-dot" />
                {selectedOrder.status}
              </span>
            </div>

            <div className="history-modal-items">
              {selectedOrder.items.map((item) => (
                <article className="history-detail-item" key={item.id}>
                  <div className="history-product-icon">
                    {isImageSource(item.image) ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="history-product-image"
                      />
                    ) : (
                      item.image
                    )}
                  </div>

                  <div className="history-detail-copy">
                    <h3>{item.name}</h3>
                    <p>Size {item.size}</p>
                    <p>
                      Đường: {item.sugar} · Đá: {item.ice}
                    </p>
                    <p>
                      Topping:{" "}
                      {item.toppings.length > 0
                        ? item.toppings.join(", ")
                        : "Không có"}
                    </p>
                    <p>Số lượng: {item.quantity}</p>
                    <strong>{formatPrice(item.price * item.quantity)}</strong>
                  </div>
                </article>
              ))}
            </div>

            <div className="history-payment">
              <div>
                <span>Tiền sản phẩm</span>
                <span>{formatPrice(selectedOrder.subtotal)}</span>
              </div>

              <div>
                <span>Phí giao hàng</span>
                <span>{formatPrice(selectedOrder.shippingFee)}</span>
              </div>

              <div>
                <span>Giảm giá</span>
                <span>-{formatPrice(selectedOrder.discount)}</span>
              </div>

              <div className="history-payment-total">
                <strong>Tổng thanh toán</strong>
                <strong>{formatPrice(getOrderTotal(selectedOrder))}</strong>
              </div>
            </div>

            <button
              type="button"
              className="history-modal-done"
              onClick={() => setSelectedOrder(null)}
            >
              Đóng
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
