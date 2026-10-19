"use client";

import Link from "next/link";

export default function Header() {
return (
<header className="header">
<div className="container header-inner">
<Link href="/" className="logo">
<span className="logo-mark">☕</span>
<strong>BrewLite</strong>
</Link>

    <nav className="nav">
      <Link href="/" className="nav-link">
        Trang chủ
      </Link>
      <Link href="/menu" className="nav-link">
        Thực đơn
      </Link>
      <Link href="/orders" className="nav-link">
        Lịch sử đơn hàng
      </Link>
    </nav>

    <div className="header-actions">
      <Link href="/cart" className="btn btn-primary cart-button">
        Giỏ hàng
      </Link>
    </div>
  </div>
</header>

);
}