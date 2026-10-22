
"use client";

import Link from "next/link";
import { useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CheDo = "dang-nhap" | "dang-ky";

type TaiKhoan = {
  makh: number;
  hoten: string;
  email: string | null;
  sodienthoai: string;
  trangthai: number;
};

export default function Header() {
  const [moForm, setMoForm] = useState(false);
  const [cheDo, setCheDo] = useState<CheDo>("dang-nhap");
  const [taiKhoan, setTaiKhoan] = useState<TaiKhoan | null>(null);
  const [dangXuLy, setDangXuLy] = useState(false);
  const [thongBao, setThongBao] = useState("");
  const [loi, setLoi] = useState(false);

  const [hoten, setHoten] = useState("");
  const [sodienthoai, setSodienthoai] = useState("");
  const [email, setEmail] = useState("");
  const [matkhau, setMatkhau] = useState("");
  const [nhapLaiMatKhau, setNhapLaiMatKhau] = useState("");
  const [taiKhoanDangNhap, setTaiKhoanDangNhap] = useState("");

  function moDangNhap() {
    setCheDo("dang-nhap");
    setThongBao("");
    setLoi(false);
    setMoForm(true);
  }

  function dongForm() {
    if (dangXuLy) return;
    setMoForm(false);
    setThongBao("");
    setMatkhau("");
    setNhapLaiMatKhau("");
  }

  async function xuLySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setThongBao("");
    setLoi(false);

    if (cheDo === "dang-ky" && matkhau !== nhapLaiMatKhau) {
      setLoi(true);
      setThongBao("Mật khẩu nhập lại không khớp.");
      return;
    }

    setDangXuLy(true);

    try {
      const dangKy = cheDo === "dang-ky";

      const duLieu = dangKy
        ? {
            hoten,
            sodienthoai,
            email: email.trim() || undefined,
            matkhau,
          }
        : {
            taikhoan: taiKhoanDangNhap.trim(),
            matkhau,
          };

      const response = await fetch(
        `${API_URL}/tai-khoan/${dangKy ? "dang-ky" : "dang-nhap"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(duLieu),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message;

        throw new Error(message || "Có lỗi xảy ra. Vui lòng thử lại.");
      }

      if (dangKy) {
        setThongBao("Đăng ký thành công! Mời bạn đăng nhập.");
        setCheDo("dang-nhap");
        setTaiKhoanDangNhap(email.trim() || sodienthoai);
        setMatkhau("");
        setNhapLaiMatKhau("");
      } else {
        setTaiKhoan(data.user);
        setThongBao(`Xin chào ${data.user.hoten}! Đăng nhập thành công.`);
        setMatkhau("");
        setNhapLaiMatKhau("");
        setMoForm(false);
      }
    } catch (error) {
      setLoi(true);
      setThongBao(
        error instanceof Error
          ? error.message
          : "Không thể kết nối máy chủ.",
      );
    } finally {
      setDangXuLy(false);
    }
  }

  function dangXuat() {
    setTaiKhoan(null);
    setThongBao("");
    setMatkhau("");
  }

  return (
    <>
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
            <Link href="/2TrangMenu" className="nav-link">
              Thực đơn
            </Link>
            <Link href="/orders" className="nav-link">
              Lịch sử đơn hàng
            </Link>
          </nav>

          <div className="header-actions">
            {taiKhoan ? (
              <div className="account-actions">
                <span className="account-name">
                  Xin chào, {taiKhoan.hoten}
                </span>
                <button
                  type="button"
                  className="auth-button"
                  onClick={dangXuat}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="auth-button"
                onClick={moDangNhap}
              >
                Đăng nhập / Đăng ký
              </button>
            )}

            <Link href="/cart" className="btn btn-primary cart-button">
              Giỏ hàng
            </Link>
          </div>
        </div>
      </header>

      {moForm && (
        <div
          className="auth-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dongForm();
          }}
        >
          <section
            className="auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
          >
            <button
              type="button"
              className="auth-close"
              onClick={dongForm}
              aria-label="Đóng"
              disabled={dangXuLy}
            >
              ×
            </button>

            <div className="auth-brand">☕ BrewLite</div>
            <h2 id="auth-title">
              {cheDo === "dang-nhap" ? "Chào mừng trở lại!" : "Tạo tài khoản"}
            </h2>
            <p className="auth-subtitle">
              {cheDo === "dang-nhap"
                ? "Đăng nhập để tiếp tục đặt món yêu thích."
                : "Tham gia BrewLite để đặt đồ uống dễ dàng hơn."}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={cheDo === "dang-nhap" ? "active" : ""}
                onClick={() => {
                  setCheDo("dang-nhap");
                  setThongBao("");
                  setLoi(false);
                }}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={cheDo === "dang-ky" ? "active" : ""}
                onClick={() => {
                  setCheDo("dang-ky");
                  setThongBao("");
                  setLoi(false);
                }}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={xuLySubmit} className="auth-form">
              {cheDo === "dang-ky" ? (
                <>
                  <label htmlFor="auth-hoten">Họ và tên</label>
                  <input
                    id="auth-hoten"
                    type="text"
                    placeholder="Nhập họ và tên"
                    value={hoten}
                    onChange={(e) => setHoten(e.target.value)}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />

                  <label htmlFor="auth-phone">Số điện thoại</label>
                  <input
                    id="auth-phone"
                    type="tel"
                    placeholder="Nhập số điện thoại"
                    value={sodienthoai}
                    onChange={(e) => setSodienthoai(e.target.value)}
                    maxLength={20}
                    autoComplete="tel"
                    required
                  />

                  <label htmlFor="auth-email">
                    Email <span className="optional">(không bắt buộc)</span>
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                    autoComplete="email"
                  />
                </>
              ) : (
                <>
                  <label htmlFor="auth-account">Email hoặc số điện thoại</label>
                  <input
                    id="auth-account"
                    type="text"
                    placeholder="Nhập email hoặc số điện thoại"
                    value={taiKhoanDangNhap}
                    onChange={(e) => setTaiKhoanDangNhap(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </>
              )}

              <label htmlFor="auth-password">Mật khẩu</label>
              <input
                id="auth-password"
                type="password"
                placeholder="Ít nhất 8 ký tự"
                value={matkhau}
                onChange={(e) => setMatkhau(e.target.value)}
                minLength={8}
                autoComplete={
                  cheDo === "dang-nhap" ? "current-password" : "new-password"
                }
                required
              />

              {cheDo === "dang-ky" && (
                <>
                  <label htmlFor="auth-confirm-password">
                    Nhập lại mật khẩu
                  </label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    value={nhapLaiMatKhau}
                    onChange={(e) => setNhapLaiMatKhau(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </>
              )}

              {thongBao && (
                <p
                  className={`auth-message ${loi ? "error" : "success"}`}
                  role="status"
                >
                  {thongBao}
                </p>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={dangXuLy}
              >
                {dangXuLy
                  ? "Đang xử lý..."
                  : cheDo === "dang-nhap"
                    ? "Đăng nhập"
                    : "Tạo tài khoản"}
              </button>
            </form>

            <p className="auth-switch">
              {cheDo === "dang-nhap"
                ? "Chưa có tài khoản? "
                : "Đã có tài khoản? "}
              <button
                type="button"
                onClick={() => {
                  setCheDo(
                    cheDo === "dang-nhap" ? "dang-ky" : "dang-nhap",
                  );
                  setThongBao("");
                  setLoi(false);
                }}
              >
                {cheDo === "dang-nhap" ? "Đăng ký ngay" : "Đăng nhập"}
              </button>
            </p>
          </section>
        </div>
      )}

      <style jsx>{`
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .auth-button {
          border: 1px solid #815b43;
          border-radius: 8px;
          padding: 10px 14px;
          background: white;
          color: #68452f;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }

        .auth-button:hover {
          background: #f8f0e9;
        }

        .account-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .account-name {
          color: #68452f;
          font-size: 14px;
        }

        .auth-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow-y: auto;
          padding: 20px;
          background: rgba(25, 20, 16, 0.6);
        }

        .auth-modal {
          position: relative;
          width: 100%;
          max-width: 440px;
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 32px;
          border-radius: 18px;
          background: #fffdfb;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
        }

        .auth-close {
          position: absolute;
          top: 12px;
          right: 16px;
          border: none;
          background: transparent;
          color: #777;
          font-size: 30px;
          cursor: pointer;
        }

        .auth-brand {
          color: #815b43;
          font-size: 18px;
          font-weight: 700;
          text-align: center;
        }

        .auth-modal h2 {
          margin: 12px 0 6px;
          color: #30251f;
          font-size: 25px;
          text-align: center;
        }

        .auth-subtitle {
          margin: 0 0 22px;
          color: #777;
          font-size: 14px;
          line-height: 1.5;
          text-align: center;
        }

        .auth-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 22px;
          padding: 5px;
          border-radius: 10px;
          background: #f4eee8;
        }

        .auth-tabs button {
          padding: 11px;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: #765c4b;
          font-weight: 600;
          cursor: pointer;
        }

        .auth-tabs button.active {
          background: white;
          color: #754b30;
          box-shadow: 0 1px 5px rgba(0, 0, 0, 0.08);
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .auth-form label {
          margin-top: 4px;
          color: #49372c;
          font-size: 14px;
          font-weight: 600;
        }

        .optional {
          color: #888;
          font-weight: 400;
        }

        .auth-form input {
          box-sizing: border-box;
          width: 100%;
          min-height: 44px;
          padding: 11px 12px;
          border: 1px solid #ddd2c8;
          border-radius: 8px;
          outline: none;
          background: white;
          color: #30251f;
          font-size: 14px;
        }

        .auth-form input:focus {
          border-color: #987052;
          box-shadow: 0 0 0 3px rgba(152, 112, 82, 0.12);
        }

        .auth-submit {
          margin-top: 10px;
          padding: 13px;
          border: none;
          border-radius: 8px;
          background: #795238;
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .auth-submit:hover {
          background: #63422e;
        }

        .auth-submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .auth-message {
          margin: 6px 0;
          font-size: 13px;
          line-height: 1.5;
        }

        .auth-message.error {
          color: #b42318;
        }

        .auth-message.success {
          color: #187044;
        }

        .auth-switch {
          margin: 20px 0 0;
          color: #777;
          font-size: 14px;
          text-align: center;
        }

        .auth-switch button {
          border: none;
          background: transparent;
          color: #795238;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 760px) {
          .header-actions {
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .account-name {
            display: none;
          }

          .auth-button {
            padding: 9px 10px;
            font-size: 12px;
          }

          .auth-modal {
            padding: 28px 22px;
          }
        }
      `}</style>
    </>
  );
}