"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useCartStore } from "@/store/useCartStore";
import "./thanh-toan.css";

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
  deliveryMethod?: "DELIVERY" | "PICKUP";
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
  paymentStatus?: string;
  maFreeship?: string;
  freeShipDiscount?: number;
};

type DiscountItem = {
  id: number;
  ma: string;
  ten: string;
  mo_ta?: string;
  loai_ma: "NEW_CUSTOMER" | "MONTHLY" | "HOLIDAY" | "OTHER";
  hinh_thuc_giam: "TIEN_HANG" | "FREESHIP";
  so_tien_giam: number;
  don_hang_toi_thieu: number;
  so_luong_toi_da: number | null;
  so_luong_da_dung: number;
  ngay_bat_dau: string | null;
  ngay_ket_thuc: string | null;
  trang_thai: string;
  du_dieu_kien?: boolean;
  ly_do_khong_du_dieu_kien?: string | null;
};

type ApiRecord = Record<string, unknown>;

function isApiRecord(value: unknown): value is ApiRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getCurrentMakh(): number | null {
  const token = localStorage.getItem("brewlite_accessToken");
  const rawUser = localStorage.getItem("brewlite_user");

  if (!token || !rawUser) return null;

  try {
    const user = JSON.parse(rawUser);
    const makh = Number(user?.makh);

    return Number.isSafeInteger(makh) && makh > 0 ? makh : null;
  } catch {
    return null;
  }
}

const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("vi-VN").format(price)}₫`;

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
  const [submitError, setSubmitError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountMessage, setDiscountMessage] = useState("");

  const [freeShipCode, setFreeShipCode] = useState("");
  const [appliedFreeShipCode, setAppliedFreeShipCode] = useState("");
  const [freeShipDiscount, setFreeShipDiscount] = useState(0);
  const [freeShipMessage, setFreeShipMessage] = useState("");

  const [selectedFreeShip, setSelectedFreeShip] =
    useState<DiscountItem | null>(null);

  // Xác định modal đang chọn loại voucher nào
  const [discountModalType, setDiscountModalType] =
    useState<"TIEN_HANG" | "FREESHIP">("TIEN_HANG");

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountList, setDiscountList] = useState<DiscountItem[]>([]);
  const [selectedDiscount, setSelectedDiscount] =
    useState<DiscountItem | null>(null);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [discountListError, setDiscountListError] = useState("");
  const [manualInputCode, setManualInputCode] = useState("");

  const [paymentStep, setPaymentStep] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [urlOrderId, setUrlOrderId] = useState("");

  function resetCheckoutState() {
    setCheckout(null);
    setUrlOrderId("");
    setPaymentStep(false);

    setDiscountCode("");
    setAppliedDiscountCode("");
    setDiscount(0);
    setDiscountMessage("");

    setFreeShipCode("");
    setAppliedFreeShipCode("");
    setFreeShipDiscount(0);
    setFreeShipMessage("");

    setSelectedDiscount(null);
    setSelectedFreeShip(null);

    setDiscountList([]);
    setShowDiscountModal(false);
    setDiscountListError("");
    setManualInputCode("");

    setFormErrors({});
    setSubmitError("");
    setPaymentError("");
    setSubmitting(false);
    setLoaded(true);
  }

    useEffect(() => {
      let cancelled = false;

      Promise.resolve().then(() => {
        if (cancelled) return;

        // Kiểm tra tài khoản đang đăng nhập
        const currentMakh = getCurrentMakh();

        if (!currentMakh) {
          setLoaded(true);
          router.replace("/2TrangMenu");
          return;
        }

        const searchParams = new URLSearchParams(window.location.search);
        const queryOrderId = searchParams.get("orderId") ?? "";
        const queryStatus = searchParams.get("status");

        if (queryStatus === "failure") {
          setPaymentError(
            "Giao dịch qua VNPay Sandbox thất bại hoặc đã bị huỷ. Bạn có thể thử thanh toán lại."
          );
        }

        try {
          const raw = localStorage.getItem("brewlite_checkout");

          if (raw) {
            const parsed = JSON.parse(raw) as CheckoutData;

            if (
              parsed &&
              Array.isArray(parsed.items) &&
              parsed.orderId
            ) {
              // Không cho tài khoản khác xem checkout
              if (Number(parsed.makh) !== currentMakh) {
                setLoaded(true);
                router.replace("/2TrangMenu");
                return;
              }

              const savedOrderId = String(parsed.orderId);

              const isMatchingOrder = savedOrderId === queryOrderId;

              const isTempUrlWithRealSavedOrder =
                queryOrderId.startsWith("TEMP-") &&
                !savedOrderId.startsWith("TEMP-");

              if (isMatchingOrder || isTempUrlWithRealSavedOrder) {
                setCheckout(parsed);
                setUrlOrderId(savedOrderId);

                // Khôi phục voucher giảm tiền hàng
                setDiscount(parsed.discount ?? 0);
                setDiscountCode(parsed.maGiamGia ?? "");
                setAppliedDiscountCode(parsed.maGiamGia ?? "");

                // Khôi phục voucher Freeship
                setFreeShipDiscount(parsed.freeShipDiscount ?? 0);
                setFreeShipCode(parsed.maFreeship ?? "");
                setAppliedFreeShipCode(parsed.maFreeship ?? "");

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
                  parsed.internalOrderId &&
                  !savedOrderId.startsWith("TEMP-")
                ) {
                  setPaymentStep(true);
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
    }, [router]);

    useEffect(() => {
      function handleAuthChange() {
        const currentMakh = getCurrentMakh();

        // Đã đăng xuất hoặc tài khoản không hợp lệ
        if (!currentMakh) {
          resetCheckoutState();
          router.replace("/2TrangMenu");
          return;
        }

        // Tài khoản hiện tại không phải chủ sở hữu đơn hàng
        if (checkout && Number(checkout.makh) !== currentMakh) {
          resetCheckoutState();
          router.replace("/2TrangMenu");
        }
      }

      window.addEventListener("brewlite-auth-updated", handleAuthChange);

      return () => {
        window.removeEventListener("brewlite-auth-updated", handleAuthChange);
      };
    }, [checkout, router]);

  const orderItems = checkout?.items ?? [];
  const filteredDiscountList = discountList.filter(
    (item) => item.hinh_thuc_giam === discountModalType,
  );

  const subtotal = checkout?.subtotal ??
    orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Không tính phí giao hàng nếu khách lấy tại quán
  const isPickup = checkout?.deliveryMethod === "PICKUP";

  // Phí giao hàng ban đầu theo tổng tiền sản phẩm
  const shippingFeeBeforeDiscount = isPickup
    ? 0
    : subtotal < 100000
      ? 20000
      : subtotal < 200000
        ? 10000
        : 0;

  // Tiền Freeship thực tế, không vượt quá phí ship
  const appliedFreeShipDiscount = Math.min(
    Math.max(0, freeShipDiscount),
    shippingFeeBeforeDiscount,
  );

  // Phí giao hàng sau khi áp dụng Freeship
  const deliveryFee =
    shippingFeeBeforeDiscount - appliedFreeShipDiscount;

  // Voucher giảm tiền hàng, không được giảm quá tiền sản phẩm
  const appliedDiscount = Math.min(
    Math.max(0, discount),
    subtotal,
  );

  // Tổng thanh toán
  const total = Math.max(
    0,
    subtotal + deliveryFee - appliedDiscount,
  );

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

  async function openDiscountModal(
    type: "TIEN_HANG" | "FREESHIP",
  ) {
    setDiscountModalType(type);
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
    const isFreeShip = item.hinh_thuc_giam === "FREESHIP";

    if (
      subtotal < Number(item.don_hang_toi_thieu) ||
      (
        isFreeShip &&
        (isPickup || shippingFeeBeforeDiscount <= 0)
      )
    ) {
      const message =
        subtotal < Number(item.don_hang_toi_thieu)
          ? `Đơn hàng phải đạt tối thiểu ${
              formatPrice(Number(item.don_hang_toi_thieu))
            } để sử dụng mã "${item.ma}".`
          : isPickup
            ? "Không thể sử dụng mã Freeship khi chọn lấy tại quán."
            : "Đơn hàng hiện không có phí vận chuyển để áp dụng Freeship.";

      if (item.hinh_thuc_giam === "FREESHIP") {
        setFreeShipMessage(message);
      } else {
        setDiscountMessage(message);
      }

      return;
    }

    setShowDiscountModal(false);
    setDiscountMessage("");
    setFreeShipMessage("");

    if (item.hinh_thuc_giam === "FREESHIP") {
      setSelectedFreeShip(item);
      setFreeShipCode(item.ma);
      void applyDiscount(item.ma, "FREESHIP");
    } else {
      setSelectedDiscount(item);
      setDiscountCode(item.ma);
      void applyDiscount(item.ma, "TIEN_HANG");
    }
  }

  function removeDiscount() {
    setSelectedDiscount(null);
    setDiscountCode("");
    setAppliedDiscountCode("");
    setDiscount(0);
    setDiscountMessage("");
    setManualInputCode("");
  }

  function removeFreeShip() {
    setSelectedFreeShip(null);
    setFreeShipCode("");
    setAppliedFreeShipCode("");
    setFreeShipDiscount(0);
    setFreeShipMessage("");
    setManualInputCode("");
  }

  async function applyDiscount(
    codeToApply?: string,
    expectedType?: "TIEN_HANG" | "FREESHIP",
  ) {
    const type = expectedType ?? discountModalType;

    const ma = (
      typeof codeToApply === "string"
        ? codeToApply
        : type === "FREESHIP"
          ? freeShipCode
          : discountCode
    ).trim().toUpperCase();

    const setMessage =
      type === "FREESHIP"
        ? setFreeShipMessage
        : setDiscountMessage;

    if (!ma) {
      setMessage("Vui lòng nhập hoặc chọn mã giảm giá.");
      return;
    }

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      setMessage("Vui lòng đăng nhập để sử dụng mã giảm giá.");
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
          phiVanChuyenGoc: shippingFeeBeforeDiscount,
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

      const voucher = data.data;
      const actualType = voucher.hinh_thuc_giam;

      // Không cho dùng nhầm loại voucher
      if (actualType !== type) {
        throw new Error(
          type === "FREESHIP"
            ? "Vui lòng chọn mã Freeship."
            : "Vui lòng chọn mã giảm giá tiền hàng.",
        );
      }

      const soTienGiam = Number(voucher.so_tien_giam);

      if (!Number.isFinite(soTienGiam) || soTienGiam <= 0) {
        throw new Error("Giá trị giảm giá không hợp lệ.");
      }

      if (type === "FREESHIP") {
        setFreeShipDiscount(soTienGiam);
        setAppliedFreeShipCode(voucher.ma);
        setFreeShipCode(voucher.ma);
        setFreeShipMessage(
          `Áp dụng Freeship thành công! Miễn tối đa ${formatPrice(soTienGiam)} phí vận chuyển.`,
        );
      } else {
        setDiscount(soTienGiam);
        setAppliedDiscountCode(voucher.ma);
        setDiscountCode(voucher.ma);
        setDiscountMessage(
          `Áp dụng thành công! Bạn được giảm ${formatPrice(soTienGiam)} tiền hàng.`,
        );
      }
    } catch (error) {
      if (type === "FREESHIP") {
        setFreeShipDiscount(0);
        setAppliedFreeShipCode("");
        setSelectedFreeShip(null);
      } else {
        setDiscount(0);
        setAppliedDiscountCode("");
        setSelectedDiscount(null);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể kiểm tra mã giảm giá.",
      );
    }
  }

  function applyManualDiscount(code: string) {
    const ma = code.trim().toUpperCase();

    if (!ma) return;

    setShowDiscountModal(false);

    if (discountModalType === "FREESHIP") {
      setFreeShipCode(ma);
      void applyDiscount(ma, "FREESHIP");
    } else {
      setDiscountCode(ma);
      void applyDiscount(ma, "TIEN_HANG");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!checkout || submitting) return;

    if (!checkout.orderId.startsWith("TEMP-")) {
      setSubmitError("Đơn hàng đã được gửi lên hệ thống.");
      return;
    }

    const currentMakh = getCurrentMakh();

    if (!currentMakh || currentMakh !== Number(checkout.makh)) {
      resetCheckoutState();
      router.replace("/2TrangMenu");
      return;
    }

    const token = localStorage.getItem("brewlite_accessToken");

    if (!token) {
      resetCheckoutState();
      router.replace("/2TrangMenu");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const customerName = String(formData.get("name") ?? "").trim();
    const rawPhone = String(formData.get("phone") ?? "").trim();
    const customerPhone = rawPhone.replace(/[\s()-]/g, "");

    if (!/^0[0-9]{9}$/.test(customerPhone)) {
      setSubmitError(
        "Số điện thoại phải gồm đúng 10 chữ số, ví dụ 0901234567.",
      );
      return;
    }

    const isPickup = checkout.deliveryMethod === "PICKUP";
    const address = isPickup ? "" : String(formData.get("address") ?? "").trim();
    const phuong = isPickup ? "" : String(
        formData.get("phuong") ?? checkout.phuong ?? checkout.ward ?? "",
      ).trim();

    const note = String(formData.get("note") ?? "").trim();

    const errors: FormErrors = {};
    const nameError = validateField("name", customerName);
    const phoneError = validateField("phone", customerPhone);
    const noteError = validateField("note", note);

    if (nameError) errors.name = nameError;
    if (phoneError) errors.phone = phoneError;
    if (noteError) errors.note = noteError;

    // Chỉ kiểm tra địa chỉ và phường khi giao hàng
    if (!isPickup) {
      const addressError = validateField("address", address);
      const phuongError = validateField("phuong", phuong);

      if (addressError) errors.address = addressError;
      if (phuongError) errors.phuong = phuongError;
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setSubmitError("Vui lòng kiểm tra lại thông tin nhận hàng.");
      return;
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSubmitError("Vui lòng kiểm tra lại thông tin nhận hàng.");
      return;
    }

    // Kiểm tra mã giảm giá: Nếu đã nhập/chọn mã mà mã chưa được áp dụng thành công, không cho phép đặt hàng
    // Kiểm tra voucher giảm tiền hàng
    if (
      discountCode.trim() &&
      (
        !appliedDiscountCode ||
        appliedDiscountCode.trim().toUpperCase() !==
          discountCode.trim().toUpperCase()
      )
    ) {
      setSubmitError(
        `Voucher giảm giá "${discountCode}" chưa được áp dụng thành công.`,
      );
      return;
    }

    // Kiểm tra voucher Freeship
    if (
      freeShipCode.trim() &&
      (
        !appliedFreeShipCode ||
        appliedFreeShipCode.trim().toUpperCase() !==
          freeShipCode.trim().toUpperCase()
      )
    ) {
      setSubmitError(
        `Voucher Freeship "${freeShipCode}" chưa được áp dụng thành công.`,
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    const payload = {
      makh: checkout.makh,
      deliveryMethod: checkout.deliveryMethod ?? "DELIVERY",
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
        // Phí ship ban đầu
        phiVanChuyenGoc: shippingFeeBeforeDiscount,

        // Phí ship khách thực sự phải trả sau Freeship
        deliveryFee,

        // Voucher giảm tiền hàng
        maGiamGia: appliedDiscountCode || null,
        discount: appliedDiscount,

        // Voucher Freeship
        maFreeship: appliedFreeShipCode || null,
        freeShipDiscount: appliedFreeShipDiscount,

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
        deliveryMethod: checkout.deliveryMethod ?? "DELIVERY",
        orderId: String(realOrderId),
        internalOrderId,
        customerName,
        customerPhone,
        address,
        phuong,
        note,
        subtotal,
        deliveryFee,
        discount: appliedDiscount,
        maGiamGia: appliedDiscountCode || undefined,
        maFreeship: appliedFreeShipCode || undefined,
        freeShipDiscount: appliedFreeShipDiscount,
        totalAmount: total,
        status: "PENDING",
        paymentStatus: undefined,
      };

      // Lưu đơn thật trước khi sang bước thanh toán để không tạo đơn lại.
      localStorage.setItem(
        "brewlite_checkout",
        JSON.stringify(updatedCheckout),
      );

      // Xóa giỏ hàng của đúng tài khoản vừa đặt hàng thành công.
      useCartStore
        .getState()
        .clearCart(`brewlite_cart_${checkout.makh}`);

      // Thông báo để Header và các trang khác cập nhật số lượng giỏ hàng.
      window.dispatchEvent(new Event("brewlite-cart-updated"));

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

  function handlePayment() {
    if (!checkout?.internalOrderId) return;

    const currentMakh = getCurrentMakh();

    if (!currentMakh || currentMakh !== Number(checkout.makh)) {
      resetCheckoutState();
      router.replace("/2TrangMenu");
      return;
    }

    router.push(
      `/4TrangThanhToan/sandbox?orderId=${encodeURIComponent(
        checkout.orderId,
      )}`,
    );
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
    return (
      <main className="payment-page">
        <div className="container">
          <div className="payment-breadcrumb">
            <Link href="/3TrangGioHang">Giỏ hàng</Link>
            <span aria-hidden="true">/</span>
            <strong>Thanh toán</strong>
          </div>

          <section className="payment-card mock-payment-page-card">
            <span className="payment-eyebrow">BREWLITE PAYMENT</span>

            <h1>Xác nhận đơn hàng</h1>

            <p>
              Mã đơn hàng: <strong>#{checkout.orderId}</strong>
            </p>

            <p>
              Tổng tiền:{" "}
              <strong className="mock-payment-amount">
                {formatPrice(checkout.totalAmount)}
              </strong>
            </p>

            <div className="payment-project-notice">
              <div className="payment-project-notice-icon">🎓</div>
              <div className="payment-project-notice-body">
                <strong>Mô phỏng thanh toán đồ án (Mock Payment)</strong>
                <p>
                  Đồ án sử dụng mô hình <b>Mock Payment</b> kết nối cổng <b>VNPay Sandbox</b> để thử nghiệm luồng đặt hàng. <b>Không sử dụng tiền thật</b>.
                </p>
              </div>
            </div>

            <div className="mock-payment-info">
              <p>
                Bấm nút bên dưới để chuyển đến cổng thanh toán VNPay Sandbox và hoàn tất giao dịch thử nghiệm bằng thẻ test.
              </p>
            </div>

            {paymentError && (
              <p role="alert" className="payment-error">
                {paymentError}
              </p>
            )}

            <button
              type="button"
              className="payment-submit"
              onClick={handlePayment}
            >
              Chuyển đến cổng VNPay Sandbox
              <span aria-hidden="true">→</span>
            </button>

            <p className="secure-note">
              🔒 Môi trường thử nghiệm Mock Payment VNPay Sandbox — Không phát sinh giao dịch tiền thật.
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
                  <p>
                    {checkout.deliveryMethod === "PICKUP"
                      ? "Bạn sẽ đến quán để nhận đơn hàng."
                      : "Nhập thông tin để BrewLite giao hàng đến bạn."}
                  </p>
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

                {checkout.deliveryMethod === "PICKUP" ? (
                  <label className="field-wide">
                    Hình thức nhận hàng
                    <input
                      type="text"
                      value="Lấy tại quán"
                      readOnly
                      className="pickup-readonly-field"
                    />
                  </label>
                ) : (
                  <>
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
                      {formErrors.address && (
                        <small className="field-error">
                          {formErrors.address}
                        </small>
                      )}
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
                      {formErrors.phuong && (
                        <small className="field-error">
                          {formErrors.phuong}
                        </small>
                      )}
                    </label>
                  </>
                )}

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
                  <p>Mô phỏng thanh toán trực tuyến qua VNPay Sandbox.</p>
                </div>
              </div>

              <div className="payment-methods">
                <div className="payment-method selected" style={{ cursor: "default" }}>
                  <span className="vnpay-method-badge" aria-hidden="true">VNPay</span>
                  <div className="method-copy">
                    <strong>Cổng thanh toán VNPay Sandbox (Mock Payment)</strong>
                    <small>
                      Thanh toán qua cổng VNPay Sandbox mô phỏng, không phát sinh giao dịch tiền thật.
                    </small>
                  </div>
                  <span className="method-check" aria-hidden="true">✓</span>
                </div>
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
                {/* VOUCHER GIẢM TIỀN HÀNG */}
                <label>Voucher giảm giá</label>

                <div className="discount-actions">
                  <button
                    type="button"
                    className="discount-select-button"
                    onClick={() => openDiscountModal("TIEN_HANG")}
                    disabled={submitting}
                  >
                    <span>
                      {appliedDiscountCode
                        ? `${appliedDiscountCode} (-${formatPrice(appliedDiscount)})`
                        : discountCode
                          ? `${discountCode} (Chưa áp dụng)`
                          : "Chọn mã giảm giá"}
                    </span>
                    <span>▾</span>
                  </button>

                  {discountCode && (
                    <button
                      type="button"
                      className="discount-remove-button"
                      onClick={removeDiscount}
                      disabled={submitting}
                    >
                      ✕ Bỏ chọn
                    </button>
                  )}

                  {!appliedDiscountCode && discountCode && (
                    <button
                      type="button"
                      className="discount-apply-button"
                      onClick={() => void applyDiscount(discountCode, "TIEN_HANG")}
                      disabled={submitting}
                    >
                      Áp dụng
                    </button>
                  )}
                </div>

                {discountMessage && (
                  <small className={appliedDiscountCode ? "discount-valid" : "discount-invalid"}>
                    {discountMessage}
                  </small>
                )}

                {/* VOUCHER FREESHIP RIÊNG */}
                <label className="freeship-label">
                  Voucher Freeship
                </label>

                <div className="discount-actions">
                  <button
                    type="button"
                    className="discount-select-button"
                    onClick={() => openDiscountModal("FREESHIP")}
                    disabled={submitting}
                  >
                    <span>
                      {appliedFreeShipCode
                        ? `${appliedFreeShipCode} (Miễn ${formatPrice(appliedFreeShipDiscount)})`
                        : freeShipCode
                          ? `${freeShipCode} (Chưa áp dụng)`
                          : "Chọn mã Freeship"}
                    </span>
                    <span>▾</span>
                  </button>

                  {freeShipCode && (
                    <button
                      type="button"
                      className="discount-remove-button"
                      onClick={removeFreeShip}
                      disabled={submitting}
                    >
                      ✕ Bỏ chọn
                    </button>
                  )}

                  {!appliedFreeShipCode && freeShipCode && (
                    <button
                      type="button"
                      className="discount-apply-button"
                      onClick={() => void applyDiscount(freeShipCode, "FREESHIP")}
                      disabled={submitting}
                    >
                      Áp dụng
                    </button>
                  )}
                </div>

                {freeShipMessage && (
                  <small className={appliedFreeShipCode ? "discount-valid" : "discount-invalid"}>
                    {freeShipMessage}
                  </small>
                )}
              </div>

              <div className="summary-totals">
                <div>
                  <span>Tạm tính</span>
                  <strong>{formatPrice(subtotal)}</strong>
                </div>

                {!isPickup && (
                  <>
                    <div>
                      <span>Phí giao hàng</span>
                      <strong>{formatPrice(shippingFeeBeforeDiscount)}</strong>
                    </div>

                    {appliedFreeShipDiscount > 0 && (
                      <div className="discount-row">
                        <span>Miễn phí vận chuyển</span>
                        <strong>-{formatPrice(appliedFreeShipDiscount)}</strong>
                      </div>
                    )}

                    <div>
                      <span>Phí ship cần thanh toán</span>
                      <strong>{formatPrice(deliveryFee)}</strong>
                    </div>
                  </>
                )}
                
                {appliedDiscount > 0 && (
                  <div className="discount-row">
                    <span>Giảm giá sản phẩm</span>
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
              <div className="discount-modal-manual-input">
                <input
                  placeholder="Nhập mã ưu đãi..."
                  value={manualInputCode}
                  onChange={(e) => setManualInputCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const code = manualInputCode.trim();
                      if (code) {
                        applyManualDiscount(code);
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={!manualInputCode.trim()}
                  onClick={() => {
                    const code = manualInputCode.trim();
                    if (code) {
                      applyManualDiscount(code);
                    }
                  }}
                >
                  Áp dụng
                </button>
              </div>

              {loadingDiscounts ? (
                <p className="discount-empty">
                  Đang tải danh sách mã giảm giá...
                </p>
              ) : discountListError ? (
                <p className="discount-empty">
                  {discountListError}
                </p>
              ) : filteredDiscountList.length === 0 ? (
                <p className="discount-empty">
                  Hiện chưa có mã giảm giá nào.
                </p>
              ) : (
                filteredDiscountList.map((item) => {
                  const minOrder = Number(item.don_hang_toi_thieu);
                  const isFreeShip = item.hinh_thuc_giam === "FREESHIP";

                  let ineligibleReason = "";

                  // 1. Kiểm tra đơn hàng tối thiểu
                  if (subtotal < minOrder) {
                    ineligibleReason = `Cần mua thêm ${formatPrice(minOrder - subtotal)}`;
                  }

                  // 2. Kiểm tra điều kiện riêng của khách hàng từ backend
                  else if (item.du_dieu_kien === false) {
                    ineligibleReason =
                      item.ly_do_khong_du_dieu_kien ||
                      "Bạn không đủ điều kiện sử dụng mã này";
                  }

                  // 3. Kiểm tra điều kiện Freeship
                  else if (isFreeShip && isPickup) {
                    ineligibleReason = "Không áp dụng khi lấy tại quán";
                  }

                  else if (isFreeShip && shippingFeeBeforeDiscount <= 0) {
                    ineligibleReason = "Đơn hàng không có phí vận chuyển";
                  }

                  const isEligible = ineligibleReason === "";
                  const isCurrentlySelected =
                    discountModalType === "FREESHIP"
                      ? selectedFreeShip?.id === item.id ||
                        appliedFreeShipCode === item.ma
                      : selectedDiscount?.id === item.id ||
                        appliedDiscountCode === item.ma;

                  return (
                    <div
                      className={`discount-item ${
                        isCurrentlySelected ? "selected" : ""
                      } ${!isEligible ? "ineligible" : ""}`}
                      key={item.id}
                    >
                      <div className="discount-item-info">
                        <strong>{item.ten}</strong>

                        <span className="discount-item-code">
                          {item.ma}
                        </span>

                        <p>
                          {item.hinh_thuc_giam === "FREESHIP"
                            ? `Miễn phí ship tối đa ${formatPrice(Number(item.so_tien_giam))}`
                            : `Giảm ${formatPrice(Number(item.so_tien_giam))}`}
                        </p>                       

                        <small>
                          Đơn tối thiểu: {formatPrice(minOrder)}
                        </small>

                        {!isEligible && (
                          <span className="discount-item-badge-ineligible">
                            {ineligibleReason}
                          </span>
                        )}

                        <small>
                          Hạn sử dụng:{" "}
                          {item.ngay_ket_thuc
                            ? new Date(item.ngay_ket_thuc).toLocaleDateString("vi-VN")
                            : "Vô thời hạn"}
                        </small>

                        {item.mo_ta && (
                          <small>{item.mo_ta}</small>
                        )}
                      </div>

                      {isCurrentlySelected &&
                        (
                          discountModalType === "FREESHIP"
                            ? appliedFreeShipCode
                            : appliedDiscountCode
                        ) ? (
                        <button
                          type="button"
                          className="discount-item-active-btn"
                          onClick={() => {
                            if (discountModalType === "FREESHIP") {
                              removeFreeShip();
                            } else {
                              removeDiscount();
                            }

                            setShowDiscountModal(false);
                          }}
                        >
                          Bỏ chọn
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={!isEligible}
                          onClick={() => selectDiscount(item)}
                        >
                          {isEligible ? "Chọn" : "Không đủ điều kiện"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}

              {(
                discountModalType === "FREESHIP"
                  ? appliedFreeShipCode || freeShipCode
                  : appliedDiscountCode || discountCode
              ) && (
                <button
                  type="button"
                  className="discount-modal-clear"
                  onClick={() => {
                    if (discountModalType === "FREESHIP") {
                      removeFreeShip();
                    } else {
                      removeDiscount();
                    }
                    setShowDiscountModal(false);
                  }}
                >
                  ✕ Tắt / Hủy mã giảm giá đang dùng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
