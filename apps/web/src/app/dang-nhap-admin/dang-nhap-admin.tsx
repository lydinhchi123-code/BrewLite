
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function DangNhapAdmin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();

    if (password !== "admin123") {
      setError("Mật khẩu không chính xác!");
      return;
    }

    sessionStorage.setItem("brewlite_admin_loggedIn", "true");
    router.replace("/admin");
  };

  return (
    <div className="admin-login-page">
      <form className="admin-login-box" onSubmit={handleLogin}>
        <div className="admin-login-icon">☕</div>
        <h1>BrewLite Admin</h1>
        <p>Đăng nhập vào trang quản trị</p>

        <label>Mật khẩu quản trị</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
          autoFocus
        />

        {error && <div className="admin-login-error">{error}</div>}

        <button type="submit">Đăng nhập</button>
      </form>

      <style jsx>{`
        .admin-login-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: #f8f5f0;
          padding: 20px;
        }

        .admin-login-box {
          width: 100%;
          max-width: 400px;
          background: white;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .admin-login-icon {
          font-size: 42px;
          text-align: center;
        }

        h1, p {
          text-align: center;
          margin: 0;
        }

        h1 { color: #795334; }

        p {
          color: #888;
          margin-bottom: 15px;
        }

        label {
          font-weight: 600;
          color: #555;
        }

        input {
          padding: 13px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 15px;
          outline-color: #795334;
        }

        button {
          padding: 13px;
          background: #795334;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        }

        .admin-login-error {
          color: #d93025;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
