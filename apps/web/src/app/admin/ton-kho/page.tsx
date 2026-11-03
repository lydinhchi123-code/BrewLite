
"use client";

import { useCallback, useEffect, useState } from "react";

type BaseUnit = "ml" | "g" | "cai";

type PackagingItem = {
  packageName: string;
  quantityPerPackage: number;
  packageUnit: BaseUnit;
  isActive: boolean;
};

type InventoryItem = {
  id: number;
  name: string;
  baseUnit: BaseUnit;
  description: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  packaging: PackagingItem[];
};

type ApiRecord = Record<string, unknown>;

function isApiRecord(value: unknown): value is ApiRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatUnit(unit: BaseUnit) {
  switch (unit) {
    case "ml":
      return "ml";
    case "g":
      return "g";
    case "cai":
      return "cái";
    default:
      return unit;
  }
}

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN", {
    maximumFractionDigits: 3,
  });
}

function getPackagingLabel(packageName: string) {
  const normalized = packageName.toLowerCase();

  if (normalized.includes("hộp") || normalized.includes("hop")) {
    return "hộp";
  }
  if (normalized.includes("chai")) return "chai";
  if (normalized.includes("lon")) return "lon";
  if (normalized.includes("gói") || normalized.includes("goi")) {
    return "gói";
  }
  if (normalized.includes("túi") || normalized.includes("tui")) {
    return "túi";
  }

  return packageName;
}

function getPackagingSummary(item: InventoryItem) {
  const packages = item.packaging.filter(
    (p) =>
      p.isActive &&
      p.quantityPerPackage > 0 &&
      p.packageUnit === item.baseUnit
  );

  if (packages.length === 0) return "—";

  return packages
    .map((p) => {
      const count = item.stockQuantity / p.quantityPerPackage;

      return `${formatNumber(count)} ${getPackagingLabel(
        p.packageName
      )}`;
    })
    .join(" / ");
}

function getActivePackaging(item: InventoryItem): PackagingItem | null {
  return (
    item.packaging.find(
      (p) =>
        p.isActive &&
        p.quantityPerPackage > 0 &&
        p.packageUnit === item.baseUnit
    ) ?? null
  );
}

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
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/admin/inventory`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Không tải được tồn kho nguyên liệu (HTTP ${response.status}).`
        );
      }

      const payload: unknown = await response.json();

      const rawList: unknown[] = Array.isArray(payload)
        ? payload
        : isApiRecord(payload) && Array.isArray(payload.data)
          ? payload.data
          : [];

      const list: InventoryItem[] = rawList
        .filter(isApiRecord)
        .map((item) => {
          const rawPackaging: unknown[] = Array.isArray(item.packaging)
            ? item.packaging
            : Array.isArray(item.packagings)
              ? item.packagings
              : [];

          return {
            id: Number(item.id ?? item.ingredientId),
            name: String(item.name ?? item.ingredientName ?? ""),
            baseUnit: String(
              item.baseUnit ?? item.base_unit ?? "g"
            ) as BaseUnit,
            description:
              item.description == null
                ? null
                : String(item.description),
            stockQuantity: Number(
              item.stockQuantity ?? item.stock_quantity ?? 0
            ),
            lowStockThreshold: Number(
              item.lowStockThreshold ??
                item.low_stock_threshold ??
                10
            ),
            isActive: Boolean(
              item.isActive ?? item.is_active ?? true
            ),
            packaging: rawPackaging
              .filter(isApiRecord)
              .map((p) => ({
                packageName: String(
                  p.packageName ??
                    p.package_name ??
                    p.name ??
                    ""
                ),
                quantityPerPackage: Number(
                  p.quantityPerPackage ??
                    p.quantity_per_package ??
                    0
                ),
                packageUnit: String(
                  p.packageUnit ?? p.package_unit ?? ""
                ) as BaseUnit,
                isActive: Boolean(
                  p.isActive ?? p.is_active ?? true
                ),
              })),
          };
        });

      setItems(list);

      setQuantities(
        Object.fromEntries(
          list.map((item) => {
            const packaging = getActivePackaging(item);

            const quantity = packaging
              ? item.stockQuantity / packaging.quantityPerPackage
              : item.stockQuantity;

            return [
              item.id,
              String(Number(quantity.toFixed(3))),
            ];
          })
        )
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể tải dữ liệu tồn kho nguyên liệu."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    Promise.resolve().then(() => {
      if (active) {
        void loadInventory();
      }
    });

    return () => {
      active = false;
    };
  }, [loadInventory]);

  const saveStock = async (item: InventoryItem) => {
    const rawQuantity = quantities[item.id]?.trim() ?? "";
    const enteredQuantity = Number(rawQuantity);

    if (
      rawQuantity === "" ||
      !Number.isFinite(enteredQuantity) ||
      enteredQuantity < 0
    ) {
      setError("Số lượng phải là số không âm hợp lệ.");
      setSuccess("");
      return;
    }

    const packaging = getActivePackaging(item);

    // Có quy cách: đổi số hộp/chai/lon/gói sang đơn vị cơ sở.
    // Không có quy cách: giữ nguyên số lượng nhập.
    const stockQuantity = packaging
      ? enteredQuantity * packaging.quantityPerPackage
      : enteredQuantity;

    if (!Number.isFinite(stockQuantity)) {
      setError("Số lượng tồn kho không hợp lệ.");
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
          body: JSON.stringify({ stockQuantity }),
        }
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || `Cập nhật tồn kho thất bại (${response.status}).`
        );
      }

      await response.json().catch(() => null);

      // Tải lại dữ liệu từ backend để đồng bộ tồn kho và lịch sử.
      await loadInventory();

      setSuccess(`Đã cập nhật tồn kho nguyên liệu: ${item.name}.`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể cập nhật tồn kho nguyên liệu."
      );
    } finally {
      setSavingId(null);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const lowStockCount = items.filter(
    (item) =>
      item.isActive &&
      item.stockQuantity <= item.lowStockThreshold
  ).length;

  const totalIngredients = items.length;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Quản lý tồn kho nguyên liệu</h1>
          <p>
            Theo dõi số hộp, chai, lon và lượng nguyên liệu thực tế
            dùng để pha chế, làm bánh.
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
            <span className="admin-stat-label">Tổng nguyên liệu</span>
            <span className="admin-stat-icon">📦</span>
          </div>
          <div className="admin-stat-value">{totalIngredients}</div>
          <div className="admin-stat-note">
            Nguyên liệu trong danh sách
          </div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-top">
            <span className="admin-stat-label">Sắp hết hàng</span>
            <span className="admin-stat-icon">!</span>
          </div>
          <div className="admin-stat-value">{lowStockCount}</div>
          <div className="admin-stat-note">
            Tồn kho không vượt ngưỡng cảnh báo
          </div>
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
          placeholder="Tìm tên nguyên liệu..."
        />

        <span className="admin-muted" style={{ fontSize: 12 }}>
          {filteredItems.length} nguyên liệu
        </span>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Danh sách tồn kho nguyên liệu</h3>
        </div>

        {loading ? (
          <div className="admin-loading">
            Đang tải dữ liệu tồn kho nguyên liệu...
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>NGUYÊN LIỆU</th>
                  <th>TỔNG SỐ HỘP / CHAI / LON / GÓI</th>
                  <th>TỔNG LƯỢNG TỒN KHO</th>
                  <th>NGƯỠNG CẢNH BÁO</th>
                  <th>TÌNH TRẠNG</th>
                  <th>CẬP NHẬT SỐ LƯỢNG</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredItems.map((item) => {
                  const threshold = item.lowStockThreshold;
                  const low =
                    item.isActive &&
                    item.stockQuantity <= threshold;

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <div className="admin-stat-note">
                          ID: {item.id}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {getPackagingSummary(item)}
                        </strong>
                      </td>

                      <td>
                        <strong>
                          {formatNumber(item.stockQuantity)}{" "}
                          {formatUnit(item.baseUnit)}
                        </strong>
                      </td>

                      <td>
                        {formatNumber(threshold)}{" "}
                        {formatUnit(item.baseUnit)}
                      </td>

                      <td>
                        {!item.isActive ? (
                          <span className="admin-status">
                            Ngừng hoạt động
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

                        <div className="admin-stat-note">
                          {(() => {
                            const packaging = getActivePackaging(item);

                            return packaging
                              ? `Nhập theo ${getPackagingLabel(packaging.packageName)} (${formatNumber(
                                  packaging.quantityPerPackage
                                )} ${formatUnit(item.baseUnit)}/${getPackagingLabel(
                                  packaging.packageName
                                )})`
                              : `Nhập theo ${formatUnit(item.baseUnit)}`;
                          })()}
                        </div>
                      </td>

                      <td>
                        <button
                          className="admin-action-button"
                          disabled={
                            savingId === item.id || !item.isActive
                          }
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
                  ? "Chưa có nguyên liệu hoặc không tải được dữ liệu."
                  : "Không tìm thấy nguyên liệu phù hợp."}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
