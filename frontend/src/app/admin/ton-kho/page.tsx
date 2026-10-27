
"use client";

import { useCallback, useEffect, useState } from "react";

type InventoryItem = {
  id: number;
  name: string;
  categoryName: string;
  stockQuantity: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  isAvailable: boolean;
  inventoryStatus: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
        const response = await fetch(`${API_URL}/admin/inventory`, {
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Không tải được tồn kho (HTTP ${response.status})`);
        }

        const payload = await response.json();

        const list: InventoryItem[] = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.data)
                ? payload.data
                : [];

            setItems(list);

            setQuantities(
            Object.fromEntries(
                list.map((item) => [
                item.id,
                String(item.stockQuantity),
                ])
            )
        );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể tải dữ liệu tồn kho."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const saveStock = async (item: InventoryItem) => {
    const quantity = Number(quantities[item.id]);

    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      setError("Số lượng tồn kho phải là số nguyên không âm.");
      setSuccess("");
      return;
    }

    setSavingId(item.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/admin/inventory/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stockQuantity: quantity }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Cập nhật thất bại (${response.status})`);
      }

      setItems((previous) =>
        previous.map((product) =>
            product.id === item.id
            ? {
                ...product,
                stockQuantity: quantity,
                inventoryStatus:
                    quantity === 0
                    ? "HET_HANG"
                    : quantity <= product.lowStockThreshold
                        ? "SAP_HET_HANG"
                        : "CON_HANG",
                }
            : product
          )
        );

      setSuccess(`Đã cập nhật tồn kho: ${item.name}.`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể cập nhật tồn kho."
      );
    } finally {
      setSavingId(null);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const lowStockCount = items.filter(
    (item) =>
      item.trackInventory &&
      item.stockQuantity <= item.lowStockThreshold
  ).length;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Quản lý tồn kho</h1>
          <p>
            Theo dõi số lượng nước uống và điều chỉnh hàng tồn trong hệ thống.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={() => void loadInventory()}
          disabled={loading}
        >
          ↻ Làm mới dữ liệu
        </button>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Tổng sản phẩm</span>
            <span className="admin-stat-icon">☕</span>
          </div>
          <div className="admin-stat-value">{items.length}</div>
          <div className="admin-stat-note">Sản phẩm trong danh sách</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Sắp hết hàng</span>
            <span className="admin-stat-icon">!</span>
          </div>
          <div className="admin-stat-value">{lowStockCount}</div>
          <div className="admin-stat-note">Theo ngưỡng tồn kho từng món</div>
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
          placeholder="Tìm tên sản phẩm..."
        />
        <span className="admin-muted" style={{ fontSize: 12 }}>
          {filteredItems.length} sản phẩm
        </span>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Danh sách tồn kho</h3>
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải dữ liệu tồn kho...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SẢN PHẨM</th>
                  <th>PHÂN LOẠI</th>
                  <th>SỐ LƯỢNG HIỆN TẠI</th>
                  <th>NGƯỠNG CẢNH BÁO</th>
                  <th>TÌNH TRẠNG</th>
                  <th>CẬP NHẬT SỐ LƯỢNG</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const threshold = item.lowStockThreshold ?? 10;
                  const low = item.trackInventory && item.stockQuantity <= threshold;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div className="admin-stat-note">
                          ID: {item.id}
                        </div>
                      </td>

                      <td>{item.categoryName  || "—"}</td>
                      <td>
                        <strong>{item.stockQuantity}</strong>
                      </td>
                      <td>{threshold}</td>
                      <td>
                        {item.trackInventory === false ? (
                            <span className="admin-status">
                                Không theo dõi
                            </span>
                            ) : item.stockQuantity === 0 ? (
                            <span className="admin-status danger">
                                Hết hàng
                            </span>
                            ) : low ? (
                            <span className="admin-status danger">
                                Sắp hết hàng
                            </span>
                            ) : (
                            <span className="admin-status">
                                Còn hàng
                            </span>
                            )}
                      </td>

                      <td>
                        <input
                          className="admin-stock-input"
                          type="number"
                          min="0"
                          step="1"
                          value={quantities[item.id] ?? ""}
                          onChange={(e) =>
                            setQuantities((previous) => ({
                              ...previous,
                              [item.id]: e.target.value,
                            }))
                          }
                          aria-label={`Số lượng tồn của ${item.name}`}
                        />
                      </td>

                      <td>
                        <button
                          className="admin-action-button"
                          disabled={savingId === item.id}
                          onClick={() => void saveStock(item)}
                        >
                          {savingId === item.id ? "Đang lưu..." : "Lưu"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredItems.length === 0 && (
              <div className="admin-empty">
                {items.length === 0
                  ? "Chưa có sản phẩm hoặc không tải được dữ liệu."
                  : "Không tìm thấy sản phẩm phù hợp."}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}