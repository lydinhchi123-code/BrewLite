
"use client";

import "./trang-chu.css";
import { useEffect, useState } from "react";

type MonNoiBat = {
  ten: string;
  loai: string;
  gia: number;
  anh: string;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TEN_MON_NOI_BAT = [
  "Cà phê sữa đá",
  "Caramel Macchiato",
  "Trà sữa trân châu",
];

export default function TrangChu() {
  const [monNoiBat, setMonNoiBat] = useState<MonNoiBat[]>([]);
  const [dangTaiMon, setDangTaiMon] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function layMonNoiBat() {
      try {
        const response = await fetch(`${API_URL}/menu/products`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Không lấy được danh sách món. HTTP ${response.status}`
          );
        }

        const payload: unknown = await response.json();

        const isRecord = (
          value: unknown
        ): value is Record<string, unknown> => {
          return typeof value === "object" && value !== null && !Array.isArray(value);
        };

        const rawList: unknown[] = Array.isArray(payload)
          ? payload
          : isRecord(payload) && Array.isArray(payload.data)
            ? payload.data
            : isRecord(payload) && Array.isArray(payload.items)
              ? payload.items
              : [];

        const danhSach = rawList.filter(isRecord);

        const ketQua: MonNoiBat[] = TEN_MON_NOI_BAT
          .map((tenMon) => {
            const mon = danhSach.find((item) => {
              const tenTrongDB = String(
                item.name ?? item.product_name ?? item.productName ?? ""
              )
                .trim()
                .toLocaleLowerCase("vi-VN");

              return tenTrongDB === tenMon.toLocaleLowerCase("vi-VN");
            });

            if (!mon) {
              console.warn(`Không tìm thấy món: ${tenMon}`);
              return null;
            }

            const gia = Number(
              mon.price ??
                mon.basePrice ??
                mon.base_price ??
                mon.product_price ??
                0
            );

            const category = isRecord(mon.category)
              ? mon.category.name ?? mon.category.category_name ?? ""
              : mon.category ?? mon.category_name ?? "";

            return {
              ten: String(
                mon.name ?? mon.product_name ?? mon.productName ?? tenMon
              ),
              loai: String(category),
              gia,
              anh: String(
                mon.image ??
                  mon.image_url ??
                  mon.imageUrl ??
                  mon.imageUrlPath ??
                  ""
              ),
            };
          })
          .filter((mon): mon is MonNoiBat => mon !== null);

        if (!cancelled) {
          setMonNoiBat(ketQua);
        }
      } catch (error) {
        console.error("Lỗi tải món nổi bật:", error);

        if (!cancelled) {
          setMonNoiBat([]);
        }
      } finally {
        if (!cancelled) {
          setDangTaiMon(false);
        }
      }
    }

    layMonNoiBat();

    return () => {
      cancelled = true;
    };
  }, []);

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

      {/* Món nổi bật lấy từ API */}
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
          {dangTaiMon ? (
            <p>Đang tải món nổi bật...</p>
          ) : monNoiBat.length > 0 ? (
            monNoiBat.map((mon) => (
              <article className="tc-product-card" key={mon.ten}>
                <a
                  href="/2TrangMenu"
                  className="tc-product-image"
                  aria-label={`Xem ${mon.ten}`}
                >
                  {mon.anh ? (
                    <img src={mon.anh} alt={mon.ten} />
                  ) : (
                    <div className="tc-product-no-image">
                      Chưa có hình ảnh
                    </div>
                  )}

                  <span className="tc-product-arrow">↗</span>
                </a>

                <div className="tc-product-info">
                  <span className="tc-product-category">
                    {mon.loai}
                  </span>

                  <h3>{mon.ten}</h3>

                  <strong>
                    {mon.gia.toLocaleString("vi-VN")}₫
                  </strong>
                </div>
              </article>
            ))
          ) : (
            <p>
              Chưa tải được món nổi bật. Vui lòng kiểm tra kết nối
              máy chủ hoặc dữ liệu thực đơn.
            </p>
          )}
        </div>
      </section>

      {/* Ưu điểm */}
      <section className="tc-benefits">
        <div className="tc-benefit">
          <span>☕</span>
          <h3>Tươi ngon mỗi ngày</h3>
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
