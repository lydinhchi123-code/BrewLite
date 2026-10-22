"use client";

import "./trang-chu.css";

const monNoiBat = [
  {
    ten: "Cà phê sữa đá",
    loai: "CÀ PHÊ",
    gia: "35.000₫",
    anh: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=85",
  },
  {
    ten: "Caramel Macchiato",
    loai: "CÀ PHÊ",
    gia: "55.000₫",
    anh: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=800&q=85",
  },
  {
    ten: "Matcha Latte",
    loai: "TRÀ",
    gia: "50.000₫",
    anh: "https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=800&q=85",
  },
];

export default function TrangChu() {
  return (
    <main className="trang-chu">
      {/* Banner chính */}
      <section className="tc-hero">
        <div className="tc-hero-content">
          <span className="tc-label">BREWLITE COFFEE</span>

          <h1>
            Một chút cà phê,
            <br />
            một ngày <em>dịu dàng.</em>
          </h1>

          <p>
            Thưởng thức hương vị cà phê đặc biệt và những thức uống
            được chuẩn bị dành riêng cho bạn.
          </p>

          <a href="/2TrangMenu" className="tc-button">
            Khám phá thực đơn <span>→</span>
          </a>

          <div className="tc-hero-note">
            <span>✦</span> Pha chế tươi mới mỗi ngày
          </div>
        </div>

        <div className="tc-hero-image">
          <img
            src="https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=85"
            alt="Không gian quán cà phê BrewLite"
          />

          <div className="tc-image-note">
            <span>☕</span>
            <div>
              <strong>Your daily ritual</strong>
              <small>Good coffee, good mood.</small>
            </div>
          </div>
        </div>
      </section>

      {/* Giới thiệu */}
      <section className="tc-intro">
        <span className="tc-label">CÂU CHUYỆN BREWLITE</span>
        <h2>
          Không chỉ là cà phê,
          <br />
          mà còn là <em>khoảng nghỉ.</em>
        </h2>
        <p>
          BrewLite mang đến những thức uống chất lượng trong một
          không gian ấm áp, để mỗi ngày của bạn có thêm một khoảnh
          khắc thật dễ chịu.
        </p>
      </section>

      {/* Món nổi bật */}
      <section className="tc-products" id="mon-noi-bat">
        <div className="tc-section-heading">
          <div>
            <span className="tc-label">ĐƯỢC YÊU THÍCH</span>
            <h2>Món ngon dành cho bạn</h2>
          </div>

          <a href="/2TrangMenu" className="tc-text-link">
            Xem toàn bộ thực đơn →
          </a>
        </div>

        <div className="tc-product-grid">
          {monNoiBat.map((mon) => (
            <article className="tc-product-card" key={mon.ten}>
              <a
                href="/2TrangMenu"
                className="tc-product-image"
                aria-label={`Xem ${mon.ten}`}
              >
                <img src={mon.anh} alt={mon.ten} />
                <span className="tc-product-arrow">↗</span>
              </a>

              <div className="tc-product-info">
                <span className="tc-product-category">{mon.loai}</span>
                <h3>{mon.ten}</h3>
                <strong>{mon.gia}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Ưu điểm */}
      <section className="tc-benefits">
        <div className="tc-benefit">
          <span>☕</span>
          <h3>Chất lượng mỗi ngày</h3>
          <p>Chú trọng hương vị trong từng thức uống.</p>
        </div>

        <div className="tc-benefit">
          <span>♡</span>
          <h3>Phục vụ tận tâm</h3>
          <p>Mỗi đơn hàng đều được chuẩn bị cẩn thận.</p>
        </div>

        <div className="tc-benefit">
          <span>✦</span>
          <h3>Đặt hàng tiện lợi</h3>
          <p>Khám phá menu và đặt món ngay trên website.</p>
        </div>
      </section>
    </main>
  );
}