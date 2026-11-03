
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

type DiscountStatus = "DANG_SU_DUNG" | "AN" | "HET";
type DiscountType = "NEW_CUSTOMER" | "MONTHLY" | "HOLIDAY" | "OTHER";

type Discount = {
  id: number;
  ma: string;
  ten: string;
  mo_ta: string;
  loai_ma: DiscountType;
  so_tien_giam: number;
  don_hang_toi_thieu: number;
  so_luong_toi_da: number | null;
  so_luong_da_dung: number;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  trang_thai: DiscountStatus;
  moi_khach_mot_lan: boolean;
};

type DiscountForm = {
  ma: string;
  ten: string;
  mo_ta: string;
  loai_ma: DiscountType;
  so_tien_giam: string;
  don_hang_toi_thieu: string;
  so_luong_toi_da: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  trang_thai: "DANG_SU_DUNG" | "AN";
  moi_khach_mot_lan: boolean;
};

const emptyForm: DiscountForm = {
  ma: "",
  ten: "",
  mo_ta: "",
  loai_ma: "MONTHLY",
  so_tien_giam: "10000",
  don_hang_toi_thieu: "99000",
  so_luong_toi_da: "100",
  ngay_bat_dau: "",
  ngay_ket_thuc: "",
  trang_thai: "DANG_SU_DUNG",
  moi_khach_mot_lan: true,
};

const statusLabels: Record<DiscountStatus, string> = {
  DANG_SU_DUNG: "Đang sử dụng",
  AN: "Đang ẩn",
  HET: "Đã hết",
};

const typeLabels: Record<DiscountType, string> = {
  NEW_CUSTOMER: "Khách hàng mới",
  MONTHLY: "Mã giảm giá tháng",
  HOLIDAY: "Mã giảm giá ngày lễ",
  OTHER: "Mã giảm giá khác",
};

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("vi-VN") + "₫";
}

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("vi-VN");
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function normalizeDiscount(data: any): Discount {
  return {
    id: Number(data.id),
    ma: String(data.ma ?? ""),
    ten: String(data.ten ?? ""),
    mo_ta: String(data.mo_ta ?? ""),
    loai_ma: data.loai_ma,
    so_tien_giam: Number(data.so_tien_giam ?? 0),
    don_hang_toi_thieu: Number(data.don_hang_toi_thieu ?? 0),
    so_luong_toi_da:
      data.so_luong_toi_da === null ||
      data.so_luong_toi_da === undefined
        ? null
        : Number(data.so_luong_toi_da),
    so_luong_da_dung: Number(data.so_luong_da_dung ?? 0),
    ngay_bat_dau: data.ngay_bat_dau ?? null,
    ngay_ket_thuc: data.ngay_ket_thuc ?? null,
    trang_thai: data.trang_thai,
    moi_khach_mot_lan: Boolean(data.moi_khach_mot_lan),
  };
}

function getRemaining(discount: Discount) {
  if (discount.so_luong_toi_da === null) return null;

  return Math.max(
    0,
    discount.so_luong_toi_da - discount.so_luong_da_dung
  );
}

export default function AdminDiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] =
    useState<Discount | null>(null);

  const [form, setForm] = useState<DiscountForm>(emptyForm);

  const getToken = () => {
    return localStorage.getItem("brewlite_accessToken");
  };

  const loadDiscounts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("brewlite_accessToken");

      if (!token) {
        throw new Error("Không tìm thấy token. Vui lòng đăng nhập lại.");
      }

      const response = await fetch(`${API_URL}/discounts/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Không tải được mã giảm giá (HTTP ${response.status})`
        );
      }

      const payload = await response.json();

      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : [];

      setDiscounts(list.map(normalizeDiscount));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể tải danh sách mã giảm giá."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDiscounts();
  }, [loadDiscounts]);

  const filteredDiscounts = discounts.filter((discount) => {
    const keyword = search.trim().toLowerCase();

    const matchesSearch =
      discount.ma.toLowerCase().includes(keyword) ||
      discount.ten.toLowerCase().includes(keyword) ||
      discount.mo_ta.toLowerCase().includes(keyword);

    const matchesStatus =
      statusFilter === "ALL" ||
      discount.trang_thai === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function openCreateForm() {
    setEditingDiscount(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(discount: Discount) {
    setEditingDiscount(discount);

    setForm({
      ma: discount.ma,
      ten: discount.ten,
      mo_ta: discount.mo_ta,
      loai_ma: discount.loai_ma,
      so_tien_giam: String(discount.so_tien_giam),
      don_hang_toi_thieu: String(discount.don_hang_toi_thieu),
      so_luong_toi_da:
        discount.so_luong_toi_da === null
          ? ""
          : String(discount.so_luong_toi_da),
      ngay_bat_dau: toDateTimeLocal(discount.ngay_bat_dau),
      ngay_ket_thuc: toDateTimeLocal(discount.ngay_ket_thuc),
      trang_thai:
        discount.trang_thai === "AN" ? "AN" : "DANG_SU_DUNG",
      moi_khach_mot_lan: discount.moi_khach_mot_lan,
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingDiscount(null);
    setForm(emptyForm);
  }

  function updateForm<K extends keyof DiscountForm>(
    key: K,
    value: DiscountForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) return;

    const token = getToken();

    if (!token) {
      setError("Không tìm thấy token đăng nhập.");
      return;
    }

    const discountAmount = Number(form.so_tien_giam);
    const minimumAmount = Number(form.don_hang_toi_thieu);
    const maxQuantity =
      form.so_luong_toi_da.trim() === ""
        ? null
        : Number(form.so_luong_toi_da);

    if (!form.ma.trim() || !form.ten.trim()) {
      setError("Vui lòng nhập mã và tên chương trình.");
      return;
    }

    if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
      setError("Số tiền giảm phải lớn hơn 0.");
      return;
    }

    if (!Number.isFinite(minimumAmount) || minimumAmount < 0) {
      setError("Đơn hàng tối thiểu không hợp lệ.");
      return;
    }

    if (
      maxQuantity !== null &&
      (!Number.isInteger(maxQuantity) || maxQuantity <= 0)
    ) {
      setError("Số lượng phát hành phải là số nguyên lớn hơn 0.");
      return;
    }

    if (
      form.ngay_bat_dau &&
      form.ngay_ket_thuc &&
      new Date(form.ngay_ket_thuc) <= new Date(form.ngay_bat_dau)
    ) {
      setError("Ngày kết thúc phải sau ngày bắt đầu.");
      return;
    }

    if (
      form.loai_ma === "NEW_CUSTOMER" &&
      !form.moi_khach_mot_lan
    ) {
      setError("Mã khách hàng mới phải giới hạn mỗi khách hàng một lần.");
      return;
    }

    const payload = {
      ma: form.ma.trim().toUpperCase(),
      ten: form.ten.trim(),
      mo_ta: form.mo_ta.trim(),
      loai_ma: form.loai_ma,
      so_tien_giam: discountAmount,
      don_hang_toi_thieu: minimumAmount,
      so_luong_toi_da: maxQuantity,
      ngay_bat_dau: form.ngay_bat_dau
        ? new Date(form.ngay_bat_dau).toISOString()
        : null,
      ngay_ket_thuc: form.ngay_ket_thuc
        ? new Date(form.ngay_ket_thuc).toISOString()
        : null,
      trang_thai: form.trang_thai,
      moi_khach_mot_lan: form.moi_khach_mot_lan,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const isEditing = Boolean(editingDiscount);

      const url = isEditing
        ? `${API_URL}/discounts/${editingDiscount!.id}`
        : `${API_URL}/discounts`;

      const response = await fetch(url, {
        method: isEditing ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      let data: any = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : data.message;

        throw new Error(
          message || `Không thể lưu mã giảm giá (HTTP ${response.status})`
        );
      }

      setSuccess(
        isEditing
          ? "Cập nhật mã giảm giá thành công."
          : "Thêm mã giảm giá thành công."
      );

      setShowForm(false);
      setEditingDiscount(null);
      setForm(emptyForm);

      await loadDiscounts();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Có lỗi xảy ra khi lưu mã giảm giá."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(discount: Discount) {
    if (discount.trang_thai === "HET") {
      setError("Mã đã hết số lượng, không thể bật lại.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Không tìm thấy token đăng nhập.");
      return;
    }

    const newStatus: DiscountStatus =
      discount.trang_thai === "AN"
        ? "DANG_SU_DUNG"
        : "AN";

    if (
      newStatus === "DANG_SU_DUNG" &&
      discount.so_luong_toi_da !== null &&
      getRemaining(discount) === 0
    ) {
      setError("Mã đã hết tồn kho, không thể bật lại.");
      return;
    }

    setUpdatingId(discount.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/discounts/${discount.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            trang_thai: newStatus,
          }),
        }
      );

      const responseText = await response.text();

      let data: any = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Không thể cập nhật trạng thái mã."
        );
      }

      setSuccess(
        `Đã ${newStatus === "AN" ? "ẩn" : "bật"} mã ${discount.ma}.`
      );

      await loadDiscounts();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Không thể cập nhật trạng thái mã."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const activeCount = discounts.filter(
    (item) => item.trang_thai === "DANG_SU_DUNG"
  ).length;

  const hiddenCount = discounts.filter(
    (item) => item.trang_thai === "AN"
  ).length;

  const endedCount = discounts.filter(
    (item) => item.trang_thai === "HET"
  ).length;

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <h1>Quản lý mã giảm giá</h1>
          <p>
            Quản lý chương trình ưu đãi, số lượng phát hành và điều kiện sử dụng.
          </p>
        </div>

        <button
          className="admin-primary-button"
          onClick={openCreateForm}
        >
          + Thêm mã giảm giá
        </button>
      </section>

      <section className="admin-stats-grid">
        <article className="admin-stat-card">
          <div className="admin-stat-label">Tổng mã giảm giá</div>
          <div className="admin-stat-value">{discounts.length}</div>
          <div className="admin-stat-note">Tất cả chương trình</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-label">Đang sử dụng</div>
          <div className="admin-stat-value">{activeCount}</div>
          <div className="admin-stat-note">Có thể áp dụng</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-label">Đang ẩn</div>
          <div className="admin-stat-value">{hiddenCount}</div>
          <div className="admin-stat-note">Chưa cho khách sử dụng</div>
        </article>

        <article className="admin-stat-card">
          <div className="admin-stat-label">Đã hết</div>
          <div className="admin-stat-value">{endedCount}</div>
          <div className="admin-stat-note">Đã hết số lượng phát hành</div>
        </article>
      </section>

      {error && <div className="admin-error">{error}</div>}

      {success && (
        <div className="admin-status" style={{ marginBottom: 18 }}>
          {success}
        </div>
      )}

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <input
            className="admin-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã hoặc tên chương trình..."
          />

          <select
            className="admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DANG_SU_DUNG">Đang sử dụng</option>
            <option value="AN">Đang ẩn</option>
            <option value="HET">Đã hết</option>
          </select>
        </div>

        <button
          className="admin-action-button"
          onClick={() => void loadDiscounts()}
          disabled={loading}
        >
          ↻ Làm mới
        </button>
      </div>

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h3>Danh sách mã giảm giá</h3>
          <span className="admin-muted" style={{ fontSize: 12 }}>
            {filteredDiscounts.length} mã giảm giá
          </span>
        </div>

        {loading ? (
          <div className="admin-loading">Đang tải mã giảm giá...</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>MÃ / TÊN CHƯƠNG TRÌNH</th>
                  <th>LOẠI MÃ</th>
                  <th>GIẢM GIÁ</th>
                  <th>ĐƠN TỐI THIỂU</th>
                  <th>TỒN KHO</th>
                  <th>ĐÃ DÙNG</th>
                  <th>NGÀY BẮT ĐẦU</th>
                  <th>NGÀY KẾT THÚC</th>
                  <th>TRẠNG THÁI</th>
                  <th>THAO TÁC</th>
                </tr>
              </thead>

              <tbody>
                {filteredDiscounts.map((discount) => {
                  const remaining = getRemaining(discount);

                  return (
                    <tr key={discount.id}>
                      <td>
                        <strong>{discount.ma}</strong>
                        <div
                          className="admin-muted"
                          style={{ fontSize: 12, marginTop: 5 }}
                        >
                          {discount.ten}
                        </div>
                      </td>

                      <td>{typeLabels[discount.loai_ma] ?? discount.loai_ma}</td>

                      <td>
                        <strong>{formatMoney(discount.so_tien_giam)}</strong>
                      </td>

                      <td>
                        {discount.don_hang_toi_thieu === 0
                          ? "Không yêu cầu"
                          : formatMoney(discount.don_hang_toi_thieu)}
                      </td>

                      <td>
                        {remaining === null
                          ? "Không giới hạn"
                          : remaining.toLocaleString("vi-VN")}
                      </td>

                      <td>
                        {discount.so_luong_da_dung.toLocaleString("vi-VN")}
                      </td>

                      <td>{formatDate(discount.ngay_bat_dau)}</td>

                      <td>{formatDate(discount.ngay_ket_thuc)}</td>

                      <td>
                        <span
                          className="admin-status"
                          style={
                            discount.trang_thai === "DANG_SU_DUNG"
                              ? {
                                  backgroundColor: "#dcfce7",
                                  color: "#15803d",
                                  border: "1px solid #bbf7d0",
                                }
                              : discount.trang_thai === "AN"
                                ? {
                                    backgroundColor: "#f1f5f9",
                                    color: "#475569",
                                    border: "1px solid #e2e8f0",
                                  }
                                : {
                                    backgroundColor: "#fee2e2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                  }
                          }
                        >
                          {statusLabels[discount.trang_thai]}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: "grid", gap: 6, minWidth: 95 }}>
                          <button
                            className="admin-action-button"
                            onClick={() => openEditForm(discount)}
                          >
                            Chỉnh sửa
                          </button>

                          {discount.trang_thai !== "HET" && (
                            <button
                              className="admin-action-button"
                              disabled={updatingId === discount.id}
                              onClick={() => void toggleStatus(discount)}
                            >
                              {updatingId === discount.id
                                ? "Đang lưu..."
                                : discount.trang_thai === "AN"
                                  ? "Hiển thị"
                                  : "Ẩn mã"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredDiscounts.length === 0 && (
              <div className="admin-empty">
                {discounts.length === 0
                  ? "Chưa có mã giảm giá trong hệ thống."
                  : "Không tìm thấy mã giảm giá phù hợp."}
              </div>
            )}
          </div>
        )}
      </section>

      {/* FORM THÊM / CHỈNH SỬA MÃ GIẢM GIÁ */}
      {showForm && (
        <div
          onClick={closeForm}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
          }}
        >
          <section
            className="admin-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div className="admin-panel-header">
              <h3>
                {editingDiscount
                  ? "Chỉnh sửa mã giảm giá"
                  : "Thêm mã giảm giá mới"}
              </h3>

              <button
                type="button"
                className="admin-action-button"
                onClick={closeForm}
                disabled={saving}
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                  marginTop: 20,
                }}
              >
                <label>
                  Mã giảm giá *
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    value={form.ma}
                    onChange={(e) =>
                      updateForm("ma", e.target.value.toUpperCase())
                    }
                    placeholder="VD: THANG12-10K"
                    required
                    disabled={Boolean(editingDiscount)}
                  />
                </label>

                <label>
                  Tên chương trình *
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    value={form.ten}
                    onChange={(e) => updateForm("ten", e.target.value)}
                    placeholder="Ưu đãi tháng 12"
                    required
                  />
                </label>

                <label>
                  Loại mã *
                  <select
                    className="admin-select"
                    style={{ width: "100%", marginTop: 6 }}
                    value={form.loai_ma}
                    onChange={(e) => {
                      const value = e.target.value as DiscountType;

                      setForm((previous) => ({
                        ...previous,
                        loai_ma: value,
                        moi_khach_mot_lan:
                          value === "NEW_CUSTOMER"
                            ? true
                            : previous.moi_khach_mot_lan,
                        don_hang_toi_thieu:
                          value === "NEW_CUSTOMER"
                            ? "0"
                            : previous.don_hang_toi_thieu,
                      }));
                    }}
                  >
                    <option value="NEW_CUSTOMER">Khách hàng mới</option>
                    <option value="MONTHLY">Mã giảm giá tháng</option>
                    <option value="HOLIDAY">Mã giảm giá ngày lễ</option>
                    <option value="OTHER">Mã giảm giá khác</option>
                  </select>
                </label>

                <label>
                  Số tiền giảm (VNĐ) *
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    type="number"
                    min="1000"
                    step="1000"
                    value={form.so_tien_giam}
                    onChange={(e) =>
                      updateForm("so_tien_giam", e.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Đơn hàng tối thiểu (VNĐ)
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    type="number"
                    min="0"
                    step="1000"
                    value={form.don_hang_toi_thieu}
                    onChange={(e) =>
                      updateForm("don_hang_toi_thieu", e.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  Tổng số lượng phát hành
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    type="number"
                    min="1"
                    step="1"
                    value={form.so_luong_toi_da}
                    onChange={(e) =>
                      updateForm("so_luong_toi_da", e.target.value)
                    }
                    placeholder="Để trống nếu không giới hạn"
                  />
                </label>

                <label>
                  Ngày bắt đầu
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    type="datetime-local"
                    value={form.ngay_bat_dau}
                    onChange={(e) =>
                      updateForm("ngay_bat_dau", e.target.value)
                    }
                  />
                </label>

                <label>
                  Ngày kết thúc
                  <input
                    className="admin-search"
                    style={{ width: "100%", marginTop: 6 }}
                    type="datetime-local"
                    value={form.ngay_ket_thuc}
                    onChange={(e) =>
                      updateForm("ngay_ket_thuc", e.target.value)
                    }
                  />
                </label>

                <label>
                  Trạng thái
                  <select
                    className="admin-select"
                    style={{ width: "100%", marginTop: 6 }}
                    value={form.trang_thai}
                    onChange={(e) =>
                      updateForm(
                        "trang_thai",
                        e.target.value as "DANG_SU_DUNG" | "AN"
                      )
                    }
                  >
                    <option value="DANG_SU_DUNG">Đang sử dụng</option>
                    <option value="AN">Ẩn</option>
                  </select>
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 0,
                    alignSelf: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.moi_khach_mot_lan}
                    onChange={(e) =>
                      updateForm("moi_khach_mot_lan", e.target.checked)
                    }
                    disabled={form.loai_ma === "NEW_CUSTOMER"}
                  />
                  Mỗi khách hàng chỉ được sử dụng một lần
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  Mô tả chương trình
                  <textarea
                    className="admin-search"
                    style={{
                      width: "100%",
                      marginTop: 6,
                      minHeight: 85,
                      resize: "vertical",
                    }}
                    value={form.mo_ta}
                    onChange={(e) => updateForm("mo_ta", e.target.value)}
                    placeholder="Nhập điều kiện và nội dung ưu đãi..."
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 24,
                }}
              >
                <button
                  type="button"
                  className="admin-action-button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Đang lưu..."
                    : editingDiscount
                      ? "Lưu thay đổi"
                      : "Thêm mã giảm giá"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
