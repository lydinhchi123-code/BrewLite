"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardStats {
  totalOrders: number;
  processingOrders: number;
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const response = await fetch(
          `${API_URL}/orders/admin/dashboard-stats`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: DashboardStats = await response.json();

        setStats({
          totalOrders: Number(data.totalOrders),
          processingOrders: Number(data.processingOrders),
          totalProducts: Number(data.totalProducts),
          lowStockProducts: Number(data.lowStockProducts),
          outOfStockProducts: Number(data.outOfStockProducts),
        });
      } catch (err) {
        console.error("Lỗi tải thống kê:", err);
        setError("Không thể tải dữ liệu thống kê.");
      }
    }

    loadStats();
  }, []);

  const statCards = [
    {
      label: "Tổng đơn hàng",
      value: stats?.totalOrders,
      icon: "▤",
    },
    {
      label: "Đơn đang xử lý",
      value: stats?.processingOrders,
      icon: "◷",
    },
    {
      label: "Sản phẩm trong menu",
      value: stats?.totalProducts,
      icon: "☕",
    },
    {
      label: "Cảnh báo tồn kho",
      value: stats?.lowStockProducts,
      icon: "!",
    },
  ];

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

      {error && (
        <p role="alert" style={{ color: "#c0392b", marginBottom: 16 }}>
          {error} Hãy kiểm tra backend và API thống kê.
        </p>
      )}

      <section className="admin-stats-grid">
        {statCards.map((card) => (
          <article className="admin-stat-card" key={card.label}>
            <div className="admin-stat-top">
              <span className="admin-stat-label">{card.label}</span>
              <span className="admin-stat-icon">{card.icon}</span>
            </div>

            <div className="admin-stat-value">
              {card.value === null || card.value === undefined
                ? "—"
                : card.value.toLocaleString("vi-VN")}
            </div>

            <div className="admin-stat-note">
              {card.label === "Cảnh báo tồn kho"
                ? stats
                ? `${stats.outOfStockProducts} sản phẩm hết hàng`
                : "Đang tải dữ liệu..."
              : stats
                ? "Dữ liệu từ PostgreSQL"
                : error
                  ? "Không tải được dữ liệu"
                  : "Đang tải dữ liệu..."}
            </div>
          </article>
        ))}
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
              <p>Kiểm tra số lượng nước uống và cập nhật tồn kho.</p>
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
          {[
            ["01", "Kiểm tra đơn hàng", "Xem đơn mới và trạng thái hiện tại."],
            ["02", "Xử lý đơn hàng", "Cập nhật trạng thái theo quy trình được phép."],
            ["03", "Theo dõi hàng hóa", "Kiểm tra tồn kho và điều chỉnh số lượng khi cần."],
          ].map(([number, title, description]) => (
            <div
              key={number}
              style={{ display: "flex", gap: 14, alignItems: "center" }}
            >
              <span className="admin-stat-icon">{number}</span>
              <div>
                <strong style={{ fontSize: 13 }}>{title}</strong>
                <p className="admin-stat-note">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}