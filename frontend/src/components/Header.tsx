"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type CheDo = "dang-nhap" | "dang-ky" | "thong-tin";

type TaiKhoan = {
  makh: number;
  hoten: string;
  email: string | null;
  sodienthoai: string;
  trangthai: number;
};

export default function Header() {
  const [moForm, setMoForm] = useState(false);
  const [moMenuTaiKhoan, setMoMenuTaiKhoan] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  function moThongTinCaNhan() {
    if (!taiKhoan) return;

    setHoten(taiKhoan.hoten);
    setSodienthoai(taiKhoan.sodienthoai);
    setEmail(taiKhoan.email ?? "");
    setCheDo("thong-tin");
    setThongBao("");
    setLoi(false);
    setMoMenuTaiKhoan(false);
    setMoForm(true);
  }

  useEffect(() => {
    function xuLyClickBenNgoai(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoMenuTaiKhoan(false);
      }
    }

    document.addEventListener("mousedown", xuLyClickBenNgoai);

    return () => {
      document.removeEventListener("mousedown", xuLyClickBenNgoai);
    };
  }, []);

  useEffect(() => {
    const duLieu = localStorage.getItem("brewlite_user");

    if (duLieu) {
      try {
        setTaiKhoan(JSON.parse(duLieu));
      } catch {
        localStorage.removeItem("brewlite_user");
      }
    }
  }, []);

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
        setMatkhau("");
        setNhapLaiMatKhau("");
        setCheDo("dang-nhap");
      } else {
        if (!data.accessToken || !data.user) {
          throw new Error("Đăng nhập thành công nhưng không nhận được token.");
        }

        localStorage.setItem("brewlite_accessToken", data.accessToken);
        localStorage.setItem("brewlite_user", JSON.stringify(data.user));

        setTaiKhoan(data.user);
        setThongBao("Đăng nhập thành công!");
        setMatkhau("");
        setMoForm(false);
      }
    } catch (error) {
      setLoi(true);
      setThongBao(
        error instanceof Error ? error.message : "Không thể kết nối máy chủ.",
      );
    } finally {
      setDangXuLy(false);
    }
  }

  function dangXuat() {
    setTaiKhoan(null);
    localStorage.removeItem("brewlite_user");
    localStorage.removeItem("brewlite_accessToken");
    setThongBao("");
    setMatkhau("");
  }

  async function capNhatThongTin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!taiKhoan || dangXuLy) return;

    setDangXuLy(true);
    setThongBao("");
    setLoi(false);

    try {
      const response = await fetch(
        `${API_URL}/tai-khoan/cap-nhat/${taiKhoan.makh}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            hoten: hoten.trim(),
            sodienthoai: sodienthoai.trim(),
            email: email.trim() || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message;

        throw new Error(message || "Không thể cập nhật thông tin cá nhân.");
      }

      setTaiKhoan(data.user);
      localStorage.setItem("brewlite_user", JSON.stringify(data.user));
      setHoten(data.user.hoten);
      setSodienthoai(data.user.sodienthoai);
      setEmail(data.user.email ?? "");
      setThongBao("Cập nhật thông tin cá nhân thành công!");
      setLoi(false);

      // Đóng form sau khi lưu thành công
      setMoForm(false);
    } catch (error) {
      setLoi(true);
      setThongBao(
        error instanceof Error ? error.message : "Không thể kết nối máy chủ.",
      );
    } finally {
      setDangXuLy(false);
    }
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
            <Link href="/6TrangLichSuDonHang" className="nav-link">
              Lịch sử đơn hàng
            </Link>
          </nav>

          <div className="header-actions">
            {taiKhoan ? (
              <div className="account-actions" ref={menuRef}>
                <button
                  type="button"
                  className="auth-button"
                  onClick={() => setMoMenuTaiKhoan(!moMenuTaiKhoan)}
                >
                  {taiKhoan.hoten} ▾
                </button>

                {moMenuTaiKhoan && (
                  <div className="account-dropdown">
                    <button type="button" onClick={moThongTinCaNhan}>
                      Thông tin cá nhân
                    </button>

                    <button type="button" onClick={dangXuat}>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="auth-button"
                onClick={moDangNhap}
              >
                Đăng nhập
              </button>
            )}

            <Link href="/3TrangGioHang" className="btn btn-primary cart-button">
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
              {cheDo === "dang-nhap"
                ? "Chào mừng trở lại!"
                : cheDo === "dang-ky"
                  ? "Tạo tài khoản"
                  : "Thông tin cá nhân"}
            </h2>

            <p className="auth-subtitle">
              {cheDo === "dang-nhap"
                ? "Đăng nhập để tiếp tục đặt món yêu thích."
                : cheDo === "dang-ky"
                  ? "Tham gia BrewLite để đặt đồ uống dễ dàng hơn."
                  : "Cập nhật thông tin tài khoản của bạn."}
            </p>

            {cheDo !== "thong-tin" && (
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
            )}

            <form
              onSubmit={cheDo === "thong-tin" ? capNhatThongTin : xuLySubmit}
              className="auth-form"
            >
              {cheDo === "dang-ky" || cheDo === "thong-tin" ? (
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

              {cheDo !== "thong-tin" && (
                <>
                  <label htmlFor="auth-password">Mật khẩu</label>
                  <input
                    id="auth-password"
                    type="password"
                    placeholder="Ít nhất 8 ký tự"
                    value={matkhau}
                    onChange={(e) => setMatkhau(e.target.value)}
                    minLength={8}
                    autoComplete={
                      cheDo === "dang-nhap"
                        ? "current-password"
                        : "new-password"
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

              <button type="submit" className="auth-submit" disabled={dangXuLy}>
                {dangXuLy
                  ? "Đang xử lý..."
                  : cheDo === "thong-tin"
                    ? "Lưu thay đổi"
                    : cheDo === "dang-nhap"
                      ? "Đăng nhập"
                      : "Tạo tài khoản"}
              </button>

              {cheDo === "thong-tin" && (
                <button
                  type="button"
                  className="profile-cancel"
                  disabled={dangXuLy}
                  onClick={dongForm}
                >
                  Hủy
                </button>
              )}
            </form>

            {cheDo !== "thong-tin" && (
              <p className="auth-switch">
                {cheDo === "dang-nhap"
                  ? "Chưa có tài khoản? "
                  : "Đã có tài khoản? "}
                <button
                  type="button"
                  onClick={() => {
                    setCheDo(cheDo === "dang-nhap" ? "dang-ky" : "dang-nhap");
                    setThongBao("");
                    setLoi(false);
                  }}
                >
                  {cheDo === "dang-nhap" ? "Đăng ký ngay" : "Đăng nhập"}
                </button>
              </p>
            )}
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

        .account-actions {
          position: relative;
        }

        .account-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          z-index: 100;
          width: 200px;
          padding: 6px;
          border: 1px solid #eaded3;
          border-radius: 10px;
          background: white;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .account-dropdown button {
          display: block;
          width: 100%;
          padding: 11px 12px;
          border: none;
          border-radius: 6px;
          background: white;
          color: #49372c;
          text-align: left;
          cursor: pointer;
        }

        .account-dropdown button:hover {
          background: #f8f0e9;
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

          .profile-cancel {
            padding: 11px;
            border: 1px solid #ddd2c8;
            border-radius: 8px;
            background: white;
            color: #68452f;
            font-weight: 600;
            cursor: pointer;
          }

          .profile-cancel:hover {
            background: #f8f0e9;
          }

          .profile-cancel:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }
        }
      `}</style>
    </>
  );
}
