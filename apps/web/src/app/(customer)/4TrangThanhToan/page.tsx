"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import "./thanh-toan.css";

type PaymentMethod = "cod" | "banking" | "momo" | "vnpay";
type MockPaymentResult = "SUCCESS" | "FAILURE";
type FormField = "name" | "phone" | "address" | "phuong" | "note";
type FormErrors = Partial<Record<FormField, string>>;

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

type CheckoutItem = {
  id: string | number;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  size?: string;
  sugar?: string;
  ice?: string;
  topping?: string[];
};

type CheckoutData = {
  orderId: string;
  internalOrderId?: number;
  makh: number;
  items: CheckoutItem[];
  customerName: string;
  customerPhone: string;
  address: string;
  phuong?: string;
  ward?: string;
  note?: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  maGiamGia?: string;
  totalAmount: number;
  status: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: string;
};

type DiscountItem = {
  id: number;
  ma: string;
  ten: string;
  mo_ta?: string;
  loai_ma: "NEW_CUSTOMER" | "MONTHLY";
  so_tien_giam: number;
  don_hang_toi_thieu: number;
  so_luong_toi_da: number | null;
  so_luong_da_dung: number;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
  trang_thai: string;
};

type ApiRecord = Record<string, unknown>;

function isApiRecord(value: unknown): value is ApiRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}₫`;

function getMockQrUrl(
  method: "banking" | "momo",
  orderId: string,
  amount: number,
) {
  const content =
    method === "banking"
      ? `BREWLITE-MOCK-BANK-${orderId}-${amount}`
      : `BREWLITE-MOCK-MOMO-${orderId}-${amount}`;

  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    content,
  )}`;
}

function getItemNote(item: CheckoutItem) {
  return [
    item.size ? `Size ${item.size}` : "",
    item.sugar ? `Đường ${item.sugar}` : "",
    item.ice ? `Đá ${item.ice}` : "",
    item.topping?.length
      ? `Topping: ${item.topping.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export default function ThanhToanPage() {
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [mockResult, setMockResult] = useState<MockPaymentResult>("SUCCESS");

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountList, setDiscountList] = useState<DiscountItem[]>([]);
  const [selectedDiscount, setSelectedDiscount] =
    useState<DiscountItem | null>(null);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [discountListError, setDiscountListError] = useState("");

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [urlOrderId, setUrlOrderId] = useState("");

    useEffect(() => {
      let cancelled = false;

      Promise.resolve().then(() => {
        if (cancelled) return;

        const queryOrderId =
          new URLSearchParams(window.location.search).get("orderId") ?? "";

        try {
          const raw = localStorage.getItem("brewlite_checkout");

          if (raw) {
            const parsed = JSON.parse(raw) as CheckoutData;

            if (parsed && Array.isArray(parsed.items) && parsed.orderId) {
              const savedOrderId = String(parsed.orderId);

              const isMatchingOrder = savedOrderId === queryOrderId;
              const isTempUrlWithRealSavedOrder =
                queryOrderId.startsWith("TEMP-") &&
                !savedOrderId.startsWith("TEMP-");

              if (isMatchingOrder || isTempUrlWithRealSavedOrder) {
                setCheckout(parsed);
                setUrlOrderId(savedOrderId);
                setDiscount(parsed.discount ?? 0);

                if (parsed.paymentMethod) {
                  setPaymentMethod(parsed.paymentMethod);
                }

                if (isTempUrlWithRealSavedOrder) {
                  const newUrl = new URL(window.location.href);
                  newUrl.searchParams.set("orderId", savedOrderId);

                  window.history.replaceState(
                    window.history.state,
                    "",
                    newUrl.toString(),
                  );
                }

                if (
                  parsed.paymentStatus === "DA_THANH_TOAN" ||
                  parsed.paymentStatus === "CHO_THANH_TOAN"
                ) {
                  setIsSubmitted(true);
                } else if (
                  parsed.internalOrderId &&
                  !savedOrderId.startsWith("TEMP-")
                ) {
                  setPaymentStep(true);
                } else if (
                  parsed.status === "PAID" ||
                  parsed.status === "COMPLETED"
                ) {
                  setIsSubmitted(true);
                }
              }
            }
          }
        } catch (error) {
          console.error("Không thể đọc thông tin đơn hàng:", error);
        } finally {
          if (!cancelled) {
            setLoaded(true);
          }
        }
      });

      return () => {
        cancelled = true;
      };
    }, []);

  const orderItems = checkout?.items ?? [];

  const subtotal = checkout?.subtotal ??
    orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const deliveryFee = checkout?.deliveryFee ?? 0;

  const appliedDiscount = Math.min(
    Math.max(0, discount),
    subtotal + deliveryFee,
  );

  const total = Math.max(0, subtotal + deliveryFee - appliedDiscount);

  function validateField(field: FormField, value: string) {
    const normalized = field === "phone"
      ? value.replace(/[\s()-]/g, "")
      : value.trim();

    if (
      field === "name" &&
      (normalized.length < 2 || !/^[\p{L} ]+$/u.test(normalized))
    ) {
      return "Họ tên phải có ít nhất 2 ký tự và chỉ gồm chữ cái.";
    }
    if (field === "phone" && !/^0\d{9}$/.test(normalized)) {
      return "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
    }
    if (field === "address" && normalized.length < 10) {
      return "Địa chỉ cần có ít nhất 10 ký tự.";
    }
    if (field === "phuong" && normalized.length < 2) {
      return "Vui lòng nhập phường / xã.";
    }
    if (field === "note" && normalized.length > 200) {
      return "Ghi chú không được vượt quá 200 ký tự.";
    }
    return undefined;
  }

  function handleFieldChange(field: FormField, value: string) {
    const error = validateField(field, value);
    setFormErrors((current) => {
      const next = { ...current };
      if (error) next[field] = error;
      else delete next[field];
      return next;
    });
  }

  async function openDiscountModal() {
    setShowDiscountModal(true);
    setDiscountListError("");

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setDiscountListError("Vui lòng đăng nhập để xem mã giảm giá.");
      return;
    }

    setLoadingDiscounts(true);

    try {
      const response = await fetch(`${API_URL}/discounts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Không thể tải danh sách mã giảm giá.",
        );
      }

      setDiscountList(Array.isArray(data) ? data : []);

    } catch (error) {
      setDiscountListError(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách mã giảm giá.",
      );
    } finally {
      setLoadingDiscounts(false);
    }
  }

  function selectDiscount(item: DiscountItem) {
    setSelectedDiscount(item);
    setDiscountCode(item.ma);
    setShowDiscountModal(false);
    setDiscountMessage("");
  }

  async function applyDiscount() {
    const ma = discountCode.trim();

    if (!ma) {
      setDiscount(0);
      setAppliedDiscountCode("");
      setDiscountMessage("Vui lòng chọn mã giảm giá.");
      return;
    }

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setDiscount(0);
      setAppliedDiscountCode("");
      setDiscountMessage("Vui lòng đăng nhập để sử dụng mã giảm giá.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/discounts/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ma,
          tamTinh: subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Không thể áp dụng mã giảm giá.",
        );
      }

      const soTienGiam = Number(data.data.so_tien_giam);

      setDiscount(soTienGiam);
      setAppliedDiscountCode(data.data.ma);
      setDiscountCode(data.data.ma);

      setDiscountMessage(
        `Áp dụng thành công! Bạn được giảm ${formatPrice(soTienGiam)}.`,
      );

    } catch (error) {
      setDiscount(0);
      setAppliedDiscountCode("");

      setDiscountMessage(
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra mã giảm giá.",
      );
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!checkout || submitting) return;

    if (!checkout.orderId.startsWith("TEMP-")) {
      setSubmitError("Đơn hàng đã được gửi lên hệ thống.");
      return;
    }

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setSubmitError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const customerName = String(formData.get("name") ?? "").trim();
    const rawPhone = String(formData.get("phone") ?? "").trim();
    const customerPhone = rawPhone.replace(/[\s()-]/g, "");

    if (!/^[0-9]{10}$/.test(customerPhone)) {
      setSubmitError(
        "Số điện thoại phải gồm đúng 10 chữ số, ví dụ 0901234567.",
      );
      return;
    }

    const address = String(formData.get("address") ?? "").trim();
    const phuong = String(formData.get("phuong") ?? checkout.phuong ?? checkout.ward ?? "",).trim();
    const note = String(formData.get("note") ?? "").trim();

    const errors: FormErrors = {};
    const values: Record<FormField, string> = {
      name: customerName,
      phone: customerPhone,
      address,
      phuong,
      note,
    };
    (Object.keys(values) as FormField[]).forEach((field) => {
      const error = validateField(field, values[field]);
      if (error) errors[field] = error;
    });

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError("Vui lòng kiểm tra lại thông tin nhận hàng.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      makh: checkout.makh,
      items: checkout.items.map((item) => ({
        id: String(item.id),
        name: item.name,
        image_url: item.image ?? null,
        price: item.price,
        quantity: item.quantity,

        ...(item.size ? { size: item.size } : {}),

        ...(item.sugar ? { sugar: item.sugar } : {}),
        ...(item.ice ? { ice: item.ice } : {}),

        topping: item.topping ?? [],
      })),
        customerName,
        customerPhone,
        address,
        phuong,
        subtotal,
        deliveryFee,
        maGiamGia: appliedDiscountCode || null,
        discount: appliedDiscount,
        totalAmount: total,
        note: note || undefined,
    };

    console.log("CHECKOUT ĐỌC ĐƯỢC:", checkout);
    console.log("PAYLOAD TẠO ĐƠN HÀNG:", payload);

    try {
      const response = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: ApiRecord = {};

      try {
        const parsed: unknown = responseText
          ? JSON.parse(responseText)
          : {};

        data = isApiRecord(parsed) ? parsed : {};
      } catch {
        data = {
          message: responseText || "Backend trả về phản hồi không hợp lệ.",
        };
      }

      const responseData = isApiRecord(data.data) ? data.data : {};
      const orderData = isApiRecord(data.order) ? data.order : {};
      const nestedOrderData = isApiRecord(responseData.order)
        ? responseData.order
        : {};

      console.log("Kết quả API tạo đơn hàng:", {
        status: response.status,
        data,
      });

      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(", ")
          : typeof data.message === "string"
            ? data.message
            : JSON.stringify(data);

        throw new Error(
          `Lỗi ${response.status}: ${message || "Không thể tạo đơn hàng"}`,
        );
      }

      const realOrderId =
        data.orderId ??
        responseData.orderId ??
        data.madonhanghienthi ??
        orderData.madonhanghienthi ??
        responseData.madonhanghienthi;

      if (!realOrderId || String(realOrderId).startsWith("TEMP-")) {
        throw new Error("Không nhận được mã đơn hàng thật từ backend.");
      }

      const internalOrderId = Number(
        data.madonhang ??
        orderData.madonhang ??
        responseData.madonhang ??
        nestedOrderData.madonhang,
      );

      if (!Number.isSafeInteger(internalOrderId) || internalOrderId < 1) {
        throw new Error(
          "Không nhận được mã đơn nội bộ. Hãy kiểm tra response của OrdersService.create().",
        );
      }

      const updatedCheckout: CheckoutData = {
        ...checkout,
        orderId: String(realOrderId),
        internalOrderId,
        customerName,
        customerPhone,
        address,
        phuong,
        note,
        paymentMethod,
        subtotal,
        discount: appliedDiscount,
        maGiamGia: appliedDiscountCode || undefined,
        totalAmount: total,
        status: "PENDING",
        paymentStatus: undefined,
      };

      // Lưu đơn thật trước khi sang bước thanh toán để không tạo đơn lại.
      localStorage.setItem(
        "brewlite_checkout",
        JSON.stringify(updatedCheckout),
      );

      setCheckout(updatedCheckout);
      setUrlOrderId(String(realOrderId));
      setPaymentError("");
      setPaymentStep(true);

      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set("orderId", String(realOrderId));
      window.history.replaceState(
        window.history.state,
        "",
        newUrl.toString(),
      );
    } catch (error) {
      console.error("Lỗi khi tạo đơn hàng:", error);

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra. Vui lòng kiểm tra lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMockPayment() {
    if (!checkout?.internalOrderId || paymentSubmitting) return;

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setPaymentError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError("");

    const selectedMethod = checkout.paymentMethod ?? paymentMethod;
    if (selectedMethod === "vnpay") {
      try {
        const response = await fetch(`${API_URL}/payments/vnpay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: checkout.totalAmount,
            orderInfo: `Thanh toan don hang ${checkout.orderId}`,
          }),
        });
        const result = (await response.json()) as {
          paymentUrl?: string;
          message?: string;
        };
        if (!response.ok || !result.paymentUrl) {
          throw new Error(result.message ?? "Không thể tạo giao dịch VNPay.");
        }
        window.location.assign(result.paymentUrl);
      } catch (error) {
        setPaymentError(
          error instanceof Error
            ? error.message
            : "Không thể kết nối cổng thanh toán VNPay.",
        );
        setPaymentSubmitting(false);
      }
      return;
    }

    const backendPaymentMethod = {
      cod: "COD",
      banking: "BANKING",
      momo: "MOMO",
    }[selectedMethod];

    const storageKey = `brewlite-payment-${checkout.orderId}`;

    // Giữ cùng key nếu request lỗi mạng để retry không tạo giao dịch trùng.
    let idempotencyKey = localStorage.getItem(storageKey);

    if (!idempotencyKey) {
      idempotencyKey = `brewlite-${crypto.randomUUID()}`;
      localStorage.setItem(storageKey, idempotencyKey);
    }

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          madonhang: checkout.internalOrderId,
          phuongthuc: backendPaymentMethod,
          ...(backendPaymentMethod === "COD" ? {} : { mockResult }),
        }),
      });

      const responseText = await response.text();
      let data: ApiRecord = {};

      try {
        const parsed: unknown = responseText
          ? JSON.parse(responseText)
          : {};

        data = isApiRecord(parsed) ? parsed : {};
      } catch {
        data = { message: responseText };
      }

      if (!response.ok) {
        throw new Error(
          typeof data.message === "string"
            ? data.message
            : "Không thể xử lý thanh toán.",
        );
      }

      const updatedCheckout: CheckoutData = {
        ...checkout,
        status:
        typeof data.orderStatus === "string"
          ? data.orderStatus
          : checkout.status,
      paymentStatus:
        typeof data.paymentStatus === "string"
          ? data.paymentStatus
          : undefined,
      };

      localStorage.setItem(
        "brewlite_checkout",
        JSON.stringify(updatedCheckout),
      );
      setCheckout(updatedCheckout);

      if (data.paymentStatus === "THAT_BAI") {
        // Thất bại đã được backend ghi nhận; lần thử kế tiếp dùng key mới.
        localStorage.removeItem(storageKey);
        setPaymentError(
          "Thanh toán thất bại. Bạn có thể chọn thành công và thử lại.",
        );
        return;
      }

      // Thanh toán thành công hoặc COD đã được ghi nhận:
      // chuyển sang trang xác nhận đơn hàng.
      localStorage.removeItem(storageKey);
      localStorage.setItem("brewlite_cart", "[]");
      window.dispatchEvent(new Event("brewlite-cart-updated"));

      router.push(
        `/5TrangXacNhanDonHang?orderId=${encodeURIComponent(
          checkout.orderId,
        )}`,
      );
    } catch (error) {
      console.error("Lỗi thanh toán:", error);

      setPaymentError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi thanh toán.",
      );
    } finally {
      setPaymentSubmitting(false);
    }
  }

  if (!loaded) {
    return (
      <main className="payment-page">
        <div className="container">Đang tải thông tin đơn hàng...</div>
      </main>
    );
  }

  if (!checkout || !urlOrderId || String(checkout.orderId) !== urlOrderId) {
    return (
      <main className="payment-page">
        <section className="payment-success container">
          <span className="payment-eyebrow">
            CHƯA CÓ THÔNG TIN ĐƠN HÀNG
          </span>

          <h1>Không tìm thấy đơn hàng cần thanh toán</h1>

          <p>
            Hãy quay lại giỏ hàng và tạo đơn hàng trước khi tiếp tục.
          </p>

          <div className="payment-success-actions">
            <Link href="/3TrangGioHang" className="payment-button primary">
              Quay lại giỏ hàng
            </Link>

            <Link href="/2TrangMenu" className="payment-button secondary">
              Về Menu
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (paymentStep) {
    const selectedMethod = checkout.paymentMethod ?? paymentMethod;

    return (
      <main className="payment-page">
        <div className="container">
          <div className="payment-breadcrumb">
            <Link href="/3TrangGioHang">Giỏ hàng</Link>
            <span aria-hidden="true">/</span>
            <strong>Thanh toán</strong>
          </div>

          <section className="payment-card mock-payment-page-card">
            <span className="payment-eyebrow">BREWLITE PAYMENT DEMO</span>

            <h1>Thanh toán đơn hàng</h1>

            <p>
              Mã đơn hàng: <strong>#{checkout.orderId}</strong>
            </p>

            <p>
              Tổng tiền:{" "}
              <strong className="mock-payment-amount">
                {formatPrice(checkout.totalAmount)}
              </strong>
            </p>

            {selectedMethod === "banking" ||
            selectedMethod === "momo" ? (
              <>
                <div className="mock-payment-heading">
                  <div>
                    <h3>
                      {selectedMethod === "banking"
                        ? "Chuyển khoản ngân hàng mô phỏng"
                        : "Thanh toán MoMo mô phỏng"}
                    </h3>
                    <p>
                      Quét mã QR demo hoặc xác nhận kết quả giao dịch bên dưới.
                    </p>
                  </div>

                  <span className="mock-payment-badge">DEMO</span>
                </div>

                <div className="mock-payment-content">
                  <div className="mock-qr-wrapper">
                    <img
                      src={getMockQrUrl(
                        selectedMethod,
                        checkout.orderId,
                        checkout.totalAmount,
                      )}
                      alt="QR thanh toán mô phỏng"
                      width={220}
                      height={220}
                    />
                  </div>

                  <div className="mock-payment-info">
                    <p>
                      <span>Mã đơn hàng</span>
                      <strong>{checkout.orderId}</strong>
                    </p>

                    <p>
                      <span>Phương thức</span>
                      <strong>
                        {selectedMethod === "banking"
                          ? "Chuyển khoản ngân hàng"
                          : "Ví MoMo"}
                      </strong>
                    </p>

                    <p>
                      <span>Số tiền mô phỏng</span>
                      <strong className="mock-payment-amount">
                        {formatPrice(checkout.totalAmount)}
                      </strong>
                    </p>

                    <p className="mock-payment-warning">
                      Đây là QR demo, không dùng để chuyển tiền thật.
                    </p>

                    <label className="mock-payment-result">
                      <span>Kết quả thanh toán mô phỏng</span>
                      <select
                        value={mockResult}
                        onChange={(event) =>
                          setMockResult(
                            event.target.value as MockPaymentResult,
                          )
                        }
                      >
                        <option value="SUCCESS">Thành công</option>
                        <option value="FAILURE">Thất bại</option>
                      </select>
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <div className="mock-payment-info">
                {selectedMethod === "vnpay" ? (
                  <>
                    <h3>Thanh toán VNPay Sandbox</h3>
                    <p>
                      Bạn sẽ được chuyển đến cổng VNPay thử nghiệm để hoàn tất
                      giao dịch. Không phát sinh tiền thật.
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Thanh toán khi nhận hàng (COD)</h3>
                    <p>
                      Đơn hàng sẽ được ghi nhận. Bạn thanh toán bằng tiền mặt
                      khi nhận đồ uống.
                    </p>
                  </>
                )}
              </div>
            )}

            {paymentError && (
              <p role="alert" className="payment-error">
                {paymentError}
              </p>
            )}

            <button
              type="button"
              className="payment-submit"
              disabled={paymentSubmitting}
              onClick={handleMockPayment}
            >
              {paymentSubmitting
                ? "Đang xử lý..."
                : selectedMethod === "cod"
                  ? "Xác nhận đặt đơn COD"
                  : "Xác nhận thanh toán"}
              <span aria-hidden="true">→</span>
            </button>

            <p className="secure-note">
              {selectedMethod === "vnpay"
                ? "VNPay Sandbox chỉ dùng để kiểm thử, không phát sinh giao dịch thật."
                : "Đây là quy trình thanh toán mô phỏng, không phát sinh giao dịch tiền thật."}
            </p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="payment-page">
      <div className="container">
        <div className="payment-breadcrumb">
          <Link href="/3TrangGioHang">Giỏ hàng</Link>
          <span aria-hidden="true">/</span>
          <strong>Thanh toán</strong>
        </div>

        <header className="payment-heading">
          <span className="payment-eyebrow">BREWLITE CHECKOUT</span>

          <h1>Thanh toán đơn hàng</h1>

          <p>Hoàn tất thông tin để chúng mình chuẩn bị đơn hàng cho bạn.</p>
        </header>

        <form className="payment-layout" onSubmit={handleSubmit} noValidate>
          <div className="payment-main">
            <section className="payment-card">
              <div className="payment-card-heading">
                <span className="payment-step">01</span>

                <div>
                  <h2>Thông tin nhận hàng</h2>
                  <p>Nhập thông tin để BrewLite giao hàng đến bạn.</p>
                </div>
              </div>

              <div className="payment-fields">
                <label>
                  Họ và tên
                  <input
                    name="name"
                    type="text"
                    defaultValue={checkout.customerName}
                    placeholder="Nguyễn Minh Anh"
                    required
                    aria-invalid={Boolean(formErrors.name)}
                    className={formErrors.name ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("name", event.target.value)
                    }
                  />
                  {formErrors.name && <small className="field-error">{formErrors.name}</small>}
                </label>

                <label>
                  Số điện thoại
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={checkout.customerPhone}
                    placeholder="0901234567"
                    pattern="[0-9]{10}"
                    maxLength={10}
                    inputMode="numeric"
                    required
                    aria-invalid={Boolean(formErrors.phone)}
                    className={formErrors.phone ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("phone", event.target.value)
                    }
                  />
                  {formErrors.phone && <small className="field-error">{formErrors.phone}</small>}
                </label>

                <label className="field-wide">
                  Địa chỉ nhận hàng
                  <input
                    name="address"
                    type="text"
                    defaultValue={checkout.address}
                    placeholder="Số nhà, tên đường"
                    required
                    aria-invalid={Boolean(formErrors.address)}
                    className={formErrors.address ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("address", event.target.value)
                    }
                  />
                  {formErrors.address && <small className="field-error">{formErrors.address}</small>}
                </label>

                <label>
                  Phường
                  <input
                    name="phuong"
                    type="text"
                    defaultValue={checkout.phuong ?? checkout.ward ?? ""}
                    placeholder="Tên phường"
                    required
                    aria-invalid={Boolean(formErrors.phuong)}
                    className={formErrors.phuong ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("phuong", event.target.value)
                    }
                  />
                  {formErrors.phuong && <small className="field-error">{formErrors.phuong}</small>}
                </label>

                <label className="note-field">
                  <span className="note-label">
                    Ghi chú đơn hàng <span className="optional">(tuỳ chọn)</span>
                  </span>

                  <input
                    name="note"
                    type="text"
                    defaultValue={checkout.note ?? ""}
                    placeholder="Ví dụ: Giao giờ hành chính"
                    maxLength={200}
                    aria-invalid={Boolean(formErrors.note)}
                    className={formErrors.note ? "field-invalid" : ""}
                    onChange={(event) =>
                      handleFieldChange("note", event.target.value)
                    }
                  />
                  {formErrors.note && <small className="field-error">{formErrors.note}</small>}
                </label>
              </div>
            </section>

            <section className="payment-card">
              <div className="payment-card-heading">
                <span className="payment-step">02</span>

                <div>
                  <h2>Phương thức thanh toán</h2>
                  <p>Chọn cách thanh toán thuận tiện nhất cho bạn.</p>
                </div>
              </div>

              <div className="payment-methods">
                <label
                  className={`payment-method ${
                    paymentMethod === "cod" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                  />

                  <span className="method-icon" aria-hidden="true">
                    ₫
                  </span>

                  <span className="method-copy">
                    <strong>Thanh toán khi nhận hàng</strong>
                    <small>
                      Thanh toán bằng tiền mặt khi nhận đồ uống.
                    </small>
                  </span>

                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${
                    paymentMethod === "vnpay" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="vnpay"
                    checked={paymentMethod === "vnpay"}
                    onChange={() => setPaymentMethod("vnpay")}
                  />
                  <span className="method-icon" aria-hidden="true">
                    V
                  </span>
                  <span className="method-copy">
                    <strong>VNPay Sandbox</strong>
                    <small>Thanh toán qua cổng VNPay thử nghiệm.</small>
                  </span>
                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${
                    paymentMethod === "banking" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="banking"
                    checked={paymentMethod === "banking"}
                    onChange={() => setPaymentMethod("banking")}
                  />

                  <span className="method-icon" aria-hidden="true">
                    ↗
                  </span>

                  <span className="method-copy">
                    <strong>Chuyển khoản ngân hàng</strong>
                    <small>Quét mã QR mô phỏng cho đơn hàng.</small>
                  </span>

                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>

                <label
                  className={`payment-method ${
                    paymentMethod === "momo" ? "selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="momo"
                    checked={paymentMethod === "momo"}
                    onChange={() => setPaymentMethod("momo")}
                  />

                  <span className="method-icon momo-icon" aria-hidden="true">
                    M
                  </span>

                  <span className="method-copy">
                    <strong>Ví MoMo</strong>
                    <small>Quét mã QR MoMo mô phỏng cho đơn hàng.</small>
                  </span>

                  <span className="method-check" aria-hidden="true">
                    ✓
                  </span>
                </label>
              </div>
            </section>
          </div>

          <aside className="payment-summary">
            <div className="payment-card">
              <div className="summary-heading">
                <h2>Đơn hàng của bạn</h2>
                <Link href="/3TrangGioHang">Chỉnh sửa</Link>
              </div>

              <div className="summary-items">
                {orderItems.map((item, index) => (
                  <div className="summary-item" key={`${item.id}-${index}`}>
                    <div className="summary-item-image" aria-hidden="true">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        "☕"
                      )}
                    </div>

                    <div className="summary-item-copy">
                      <strong>{item.name}</strong>
                      <small>{getItemNote(item)}</small>
                      <span>x{item.quantity}</span>
                    </div>

                    <strong>
                      {formatPrice(item.price * item.quantity)}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="discount-form">
                <label>Mã giảm giá</label>

                <div className="discount-actions">
                  <button
                    type="button"
                    className="discount-select-button"
                    onClick={openDiscountModal}
                    disabled={submitting}
                  >
                    <span>
                      {discountCode || "Chọn mã ưu đãi"}
                    </span>
                    <span>▾</span>
                  </button>

                  <button
                    type="button"
                    className="discount-apply-button"
                    onClick={applyDiscount}
                    disabled={submitting || !discountCode}
                  >
                    Áp dụng
                  </button>
                </div>

                {discountMessage && (
                  <small
                    className={
                      appliedDiscountCode
                        ? "discount-valid"
                        : "discount-invalid"
                    }
                  >
                    {discountMessage}
                  </small>
                )}
              </div>

              <div className="summary-totals">
                <div>
                  <span>Tạm tính</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                <div>
                  <span>Phí giao hàng</span>
                  <strong>{formatPrice(deliveryFee)}</strong>
                </div>

                {appliedDiscount > 0 && (
                  <div className="discount-row">
                    <span>Giảm giá</span>
                    <strong>-{formatPrice(appliedDiscount)}</strong>
                  </div>
                )}

                <div className="summary-total">
                  <span>Tổng cộng</span>
                  <strong>{formatPrice(total)}</strong>
                </div>
              </div>

              {submitError && (
                <p role="alert" className="payment-error">
                  {submitError}
                </p>
              )}

              <button
                type="submit"
                className="payment-submit"
                disabled={submitting}
              >
                {submitting
                  ? "Đang tạo đơn hàng..."
                  : `Đặt hàng · ${formatPrice(total)}`}
                <span aria-hidden="true">→</span>
              </button>

              <p className="secure-note">
                <span aria-hidden="true">⌁</span> Thông tin của bạn được bảo
                mật an toàn
              </p>
            </div>
          </aside>
        </form>
      </div>

      {showDiscountModal && (
        <div
          className="discount-modal-overlay"
          onClick={() => setShowDiscountModal(false)}
        >
          <div
            className="discount-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="discount-modal-header">
              <div>
                <h2>Mã giảm giá</h2>
                <p>Chọn ưu đãi phù hợp cho đơn hàng của bạn.</p>
              </div>

              <button
                type="button"
                className="discount-modal-close"
                onClick={() => setShowDiscountModal(false)}
              >
                ×
              </button>
            </div>

            <div className="discount-modal-body">
              {loadingDiscounts ? (
                <p className="discount-empty">
                  Đang tải danh sách mã giảm giá...
                </p>
              ) : discountListError ? (
                <p className="discount-empty">
                  {discountListError}
                </p>
              ) : discountList.length === 0 ? (
                <p className="discount-empty">
                  Hiện chưa có mã giảm giá nào.
                </p>
              ) : (
                discountList.map((item) => (
                  <div
                    className={`discount-item ${
                      selectedDiscount?.id === item.id
                        ? "selected"
                        : ""
                    }`}
                    key={item.id}
                  >
                    <div className="discount-item-info">
                      <strong>{item.ten}</strong>

                      <span className="discount-item-code">
                        {item.ma}
                      </span>

                      <p>
                        Giảm {formatPrice(Number(item.so_tien_giam))}
                      </p>

                      <small>
                        Đơn tối thiểu:{" "}
                        {formatPrice(Number(item.don_hang_toi_thieu))}
                      </small>

                      <small>
                        Hạn sử dụng:{" "}
                        {new Date(item.ngay_ket_thuc).toLocaleDateString("vi-VN")}
                      </small>

                      {item.mo_ta && (
                        <small>{item.mo_ta}</small>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => selectDiscount(item)}
                    >
                      Chọn
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
