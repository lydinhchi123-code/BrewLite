import Link from "next/link";

export default function Footer() {
return (
<footer>
<div className="container">
<div className="footer-grid">
<div>
<Link href="/" className="logo logo-light">
<span className="logo-mark">☕</span>
<strong>BrewLite</strong>
</Link>
<p>
Tận hưởng những ly cà phê thơm ngon,
được pha chế dành riêng cho bạn.
</p>
</div>

      <div>
        <strong>Khám phá</strong>
        <Link href="/" className="footer-link">Trang chủ</Link>
        <Link href="/menu" className="footer-link">Thực đơn</Link>
        <Link href="/orders" className="footer-link">
          Lịch sử đơn hàng
        </Link>
      </div>

      <div>
        <strong>Hỗ trợ</strong>
        <span>Hướng dẫn đặt hàng</span>
        <span>Chính sách thanh toán</span>
        <span>Liên hệ</span>
      </div>

      <div className="footer-note">
        <strong>Một chút cà phê, một chút bình yên.</strong>
        <p>Cảm ơn bạn đã lựa chọn BrewLite!</p>
      </div>
    </div>

    <div className="footer-bottom">
      <span>© 2026 BrewLite</span>
      <span>Made with love for coffee lovers.</span>
    </div>
  </div>
</footer>

);
}