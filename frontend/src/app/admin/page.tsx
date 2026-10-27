import Link from "next/link";

export default function AdminDashboard() {
  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Tổng quan cửa hàng</h1>
          <p>
            Chào mừng đến với hệ thống quản trị BrewLite.
            Theo dõi đơn hàng và tình trạng hàng hóa tại đây.
          </p>
        </div>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Tổng đơn hàng</span>
            <span className="admin-stat-icon">▤</span>
          </div>
          <div className="admin-stat-value">—</div>
          <div className="admin-stat-note">Chưa tải dữ liệu thống kê</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Đơn đang xử lý</span>
            <span className="admin-stat-icon">◷</span>
          </div>
          <div className="admin-stat-value">—</div>
          <div className="admin-stat-note">Chưa tải dữ liệu thống kê</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Sản phẩm trong menu</span>
            <span className="admin-stat-icon">☕</span>
          </div>
          <div className="admin-stat-value">—</div>
          <div className="admin-stat-note">Chưa tải dữ liệu thống kê</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Cảnh báo tồn kho</span>
            <span className="admin-stat-icon">!</span>
          </div>
          <div className="admin-stat-value">—</div>
          <div className="admin-stat-note">Chưa tải dữ liệu thống kê</div>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Bắt đầu quản lý</h3>
        </div>

        <div className="admin-shortcuts" style={{ padding: 20 }}>
          <Link href="/admin/don-hang" className="admin-shortcut">
            <span className="admin-shortcut-icon">▤</span>
            <div>
              <h3>Quản lý đơn hàng</h3>
              <p>
                Xem đơn hàng, thông tin khách hàng và cập nhật
                trạng thái xử lý.
              </p>
            </div>
            <span>→</span>
          </Link>

          <Link href="/admin/ton-kho" className="admin-shortcut">
            <span className="admin-shortcut-icon">▣</span>
            <div>
              <h3>Quản lý tồn kho</h3>
              <p>
                Kiểm tra số lượng nước uống và cập nhật tồn kho.
              </p>
            </div>
            <span>→</span>
          </Link>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Quy trình quản trị</h3>
        </div>

        <div style={{ padding: 23, display: "grid", gap: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="admin-stat-icon">01</span>
            <div>
              <strong style={{ fontSize: 13 }}>Kiểm tra đơn hàng</strong>
              <p className="admin-stat-note">
                Xem đơn mới và trạng thái hiện tại.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="admin-stat-icon">02</span>
            <div>
              <strong style={{ fontSize: 13 }}>Xử lý đơn hàng</strong>
              <p className="admin-stat-note">
                Cập nhật trạng thái theo quy trình được phép.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span className="admin-stat-icon">03</span>
            <div>
              <strong style={{ fontSize: 13 }}>Theo dõi hàng hóa</strong>
              <p className="admin-stat-note">
                Kiểm tra tồn kho và điều chỉnh số lượng khi cần.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}