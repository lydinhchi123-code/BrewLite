
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import "./admin.css";

const menuItems = [
  { label: "Tổng quan", href: "/admin", icon: "▦" },
  { label: "Đơn hàng", href: "/admin/don-hang", icon: "▤" },
  { label: "Tồn kho", href: "/admin/ton-kho", icon: "▣" },
];

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-icon">☕</span>
          <span>
            <strong>BrewLite</strong>
            <small>ADMINISTRATION</small>
          </span>
        </Link>

        <div className="admin-menu-label">MENU CHÍNH</div>

        <nav className="admin-nav">
          {menuItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${active ? "active" : ""}`}
              >
                <span className="admin-nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {active && <span className="admin-nav-indicator" />}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-avatar">A</div>
          <div className="admin-account">
            <strong>Quản trị viên</strong>
            <span>Administrator</span>
          </div>
          <span className="admin-online-dot" />
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-topbar-label">BREWLITE / ADMIN</span>
            <h2>
              {menuItems.find((item) =>
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href)
              )?.label ?? "Quản trị"}
            </h2>
          </div>

          <Link href="/1TrangChu" className="admin-view-store">
            <span>↗</span> Xem cửa hàng
          </Link>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
