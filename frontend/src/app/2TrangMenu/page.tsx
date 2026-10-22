"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./menu.css";

type Category = {
  name: string;
  slug: string;
};

type SizeOption = {
  code: string;
  name: string;
  price: number;
};

type ToppingOption = {
  id?: number;
  name: string;
  price: number;
};

type Product = {
  id: number;
  name: string;
  category: string;
  categorySlug: string;
  price: number;
  image: string;
  description: string;
  tag?: string;
  sizes: SizeOption[];
  toppings: ToppingOption[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const DEFAULT_CATEGORIES: Category[] = [
  { name: "Tất cả", slug: "all" },
  { name: "Cà phê", slug: "ca-phe" },
  { name: "Trà", slug: "tra" },
  { name: "Trà sữa", slug: "tra-sua" },
  { name: "Đá xay", slug: "da-xay" },
  { name: "Bánh", slug: "banh" },
];

function unwrapArray(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeProduct(raw: any): Product {
  const categoryData =
    raw.category ??
    raw.menu_category ??
    raw.menu_categories ??
    {};

  const category =
    typeof categoryData === "object"
      ? categoryData.name ??
        raw.categoryName ??
        raw.category_name ??
        "Khác"
      : raw.categoryName ??
        raw.category_name ??
        categoryData ??
        "Khác";

  const categorySlug =
    typeof categoryData === "object"
      ? categoryData.slug ??
        raw.categorySlug ??
        raw.category_slug ??
        ""
      : raw.categorySlug ??
        raw.category_slug ??
        "";

  // SQL: menu_product_sizes(product_id, size_code, size_name, price)
  // Backend nên gộp các dòng size thành mảng raw.sizes cho từng sản phẩm.
  const rawSizes =
    raw.sizes ??
    raw.sizeOptions ??
    raw.size_options ??
    raw.menu_product_sizes ??
    raw.productSizes ??
    raw.product_sizes ??
    raw.productSizesList ??
    [];

  // SQL: menu_product_toppings JOIN menu_toppings.
  // Mỗi phần tử nên có topping_id/id, topping_name/name, topping_price/price.
  const rawToppings =
    raw.toppings ??
    raw.toppingOptions ??
    raw.topping_options ??
    raw.availableToppings ??
    raw.available_toppings ??
    raw.productToppings ??
    raw.product_toppings ??
    raw.menu_product_toppings ??
    raw.menuProductToppings ??
    [];

  const sizes: SizeOption[] = Array.isArray(rawSizes)
    ? rawSizes
        .map((item: any) => {
          const s = item.size ?? item.menu_product_size ?? item;
          return {
            code: String(
              s.code ?? s.size_code ?? s.sizeCode ?? s.size ?? ""
            ),
            name: String(
              s.name ??
                s.size_name ??
                s.sizeName ??
                s.size_code ??
                s.sizeCode ??
                s.code ??
                ""
            ),
            price: Number(
              s.price ??
                s.size_price ??
                s.sizePrice ??
                item.price ??
                0
            ),
          };
        })
        .filter((s: SizeOption) => s.code && s.name)
    : [];

  const toppings: ToppingOption[] = Array.isArray(rawToppings)
    ? rawToppings
        .map((item: any) => {
          const t =
            item.topping ??
            item.menu_topping ??
            item.menuTopping ??
            item.menu_toppings ??
            item.topping_info ??
            item;

          const id =
            t.id ??
            t.topping_id ??
            t.toppingId ??
            item.topping_id ??
            item.toppingId;

          return {
            id: id == null ? undefined : Number(id),
            name: String(
              t.name ??
                t.topping_name ??
                t.toppingName ??
                item.topping_name ??
                item.name ??
                ""
            ).trim(),
            price: Number(
              t.price ??
                t.topping_price ??
                t.toppingPrice ??
                item.topping_price ??
                0
            ),
          };
        })
        .filter(
          (t: ToppingOption) =>
            t.name.length > 0 && Number.isFinite(t.price)
        )
        .filter(
          (t: ToppingOption, index: number, arr: ToppingOption[]) =>
            arr.findIndex((other) => other.name === t.name) === index
        )
    : [];

  return {
    id: Number(raw.id ?? raw.product_id ?? raw.productId),
    name: String(raw.name ?? raw.product_name ?? "Sản phẩm"),
    category: String(category),
    categorySlug: String(categorySlug),
    price: Number(
      raw.price ??
        raw.basePrice ??
        raw.base_price ??
        raw.product_price ??
        0
    ),
    image: String(
      raw.image ??
        raw.imageUrl ??
        raw.image_url ??
        raw.imageUrlPath ??
        ""
    ),
    description: String(
      raw.description ?? raw.product_description ?? ""
    ),
    tag:
      raw.tag ??
      (raw.is_featured ?? raw.isFeatured
        ? "Được yêu thích"
        : undefined),
    sizes,
    toppings,
  };
}

const money = (value: number) =>
  value.toLocaleString("vi-VN") + "₫";

function isCake(product: Product) {
  return (
    product.categorySlug === "banh" ||
    product.categorySlug === "banh-ngot" ||
    product.category.toLocaleLowerCase("vi-VN").includes("bánh")
  );
}

export default function MenuPage() {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] =
    useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState<Product | null>(null);
  const [size, setSize] = useState("M");
  const [sugar, setSugar] = useState("100%");
  const [ice, setIce] = useState("100%");
  const [toppings, setToppings] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      setLoading(true);
      setLoadError("");

      try {
        const [productResponse, categoryResponse] = await Promise.all([
          fetch(`${API_URL}/menu/products`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`${API_URL}/menu/categories`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);

        if (!productResponse.ok) {
          throw new Error(
            `Không tải được sản phẩm (HTTP ${productResponse.status}).`
          );
        }

        const productPayload = await productResponse.json();

        const loadedProducts = unwrapArray(productPayload)
          .map(normalizeProduct)
          .filter((p) => p.id && p.name)
          .filter(
            (p) =>
              p.name.trim().toLocaleLowerCase("vi-VN") !== "matcha latte"
          )
          .filter((p) => p.categorySlug !== "latte");

        setProducts(loadedProducts);

        if (categoryResponse.ok) {
          const categoryPayload = unwrapArray(
            await categoryResponse.json()
          );

          const allowedSlugs = [
            "ca-phe",
            "tra",
            "tra-sua",
            "da-xay",
            "banh",
            "banh-ngot",
          ];

          const loadedCategories: Category[] = categoryPayload
            .map((c: any) => ({
              name: String(c.name ?? ""),
              slug: String(c.slug ?? ""),
            }))
            .filter((c: Category) => allowedSlugs.includes(c.slug))
            .map((c: Category) =>
              c.slug === "banh-ngot"
                ? { ...c, name: "Bánh" }
                : c
            );

          const ordered = DEFAULT_CATEGORIES.filter(
            (c) =>
              c.slug === "all" ||
              loadedCategories.some((item) => item.slug === c.slug) ||
              (c.slug === "banh" &&
                loadedCategories.some((item) => item.slug === "banh-ngot"))
          ).map((c) => {
            if (c.slug === "all") return c;

            return (
              loadedCategories.find((item) => item.slug === c.slug) ??
              loadedCategories.find(
                (item) => c.slug === "banh" && item.slug === "banh-ngot"
              ) ??
              c
            );
          });

          setCategories(ordered);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        setLoadError(
          error instanceof Error
            ? error.message
            : "Có lỗi khi tải thực đơn."
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadMenu();
    return () => controller.abort();
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const matchesCategory =
          category === "all" ||
          p.categorySlug === category ||
          (category === "banh" && p.categorySlug === "banh-ngot");

        const matchesSearch = p.name
          .toLocaleLowerCase("vi-VN")
          .includes(search.trim().toLocaleLowerCase("vi-VN"));

        return matchesCategory && matchesSearch;
      }),
    [products, category, search]
  );

  const selectedSize = selected?.sizes.find((s) => s.code === size);

  const productPrice = selected
    ? selectedSize?.price ?? selected.price
    : 0;

  const availableToppings =
    selected && !isCake(selected) ? selected.toppings : [];

  const toppingPrice = availableToppings
    .filter((t) => toppings.includes(t.name))
    .reduce((sum, t) => sum + t.price, 0);

  const currentPrice = productPrice + toppingPrice;

  function openProduct(product: Product) {
    setSelected(product);
    setSize(
      product.sizes.some((s) => s.code === "M")
        ? "M"
        : product.sizes[0]?.code ?? "M"
    );
    setSugar("100%");
    setIce("100%");
    setToppings([]);
  }

  function closeProduct() {
    setSelected(null);
    setToppings([]);
  }

  function addToCart() {
    if (!selected) return;

    const chosenSize = selected.sizes.find((s) => s.code === size);
    const selectedToppings = availableToppings.filter((t) =>
      toppings.includes(t.name)
    );

    const cartItem = {
      key: `${selected.id}-${size}-${sugar}-${ice}-${toppings
        .slice()
        .sort()
        .join(",")}`,
      product: {
        ...selected,
        price: productPrice,
      },
      size,
      sizeName: chosenSize?.name ?? size,
      sugar: isCake(selected) ? null : sugar,
      ice: isCake(selected) ? null : ice,
      toppings: selectedToppings,
      qty: 1,
      unitPrice: currentPrice,
    };

    try {
      const oldCart = JSON.parse(
        localStorage.getItem("brewlite_cart") || "[]"
      );

      const exists = oldCart.findIndex(
        (item: { key: string }) => item.key === cartItem.key
      );

      if (exists >= 0) {
        oldCart[exists].qty += 1;
      } else {
        oldCart.push(cartItem);
      }

      localStorage.setItem("brewlite_cart", JSON.stringify(oldCart));
      setNotice("Đã thêm món vào giỏ hàng!");
      closeProduct();
      window.setTimeout(() => setNotice(""), 2600);
    } catch {
      setNotice("Không thể lưu giỏ hàng trên trình duyệt này.");
    }
  }

  return (
    <main className="bl-menu-page">
      <section className="bl-menu-hero">
        <div className="bl-menu-hero-copy">
          <div className="bl-eyebrow">
            <span /> MENU CỦA CHÚNG MÌNH
          </div>

          <h1>
            Thưởng thức vị ngon,
            <br />
            <em>tận hưởng bình yên.</em>
          </h1>

          <p>
            Từ cà phê đậm đà đến trà trái cây tươi mát — chọn món yêu thích
            và để BrewLite chăm chút phần còn lại.
          </p>

          <a className="bl-menu-hero-button" href="#menu-list">
            Khám phá thực đơn <span>↘</span>
          </a>

          <div className="bl-menu-hero-note">
            <span>✦</span> Pha chế tươi mới mỗi ngày
          </div>
        </div>

        <div className="bl-menu-hero-photo">
          <img src="/images/caphesuada.jpg" alt="Thực đơn BrewLite" />
          <div className="bl-menu-photo-caption">
            <span>☕</span>
            <div>
              <strong>Made with care</strong>
              <small>Mỗi ly là một chút yêu thương</small>
            </div>
          </div>
        </div>
      </section>

      <section className="bl-menu-catalog" id="menu-list">
        <div className="bl-menu-heading">
          <div>
            <div className="bl-eyebrow">
              <span /> BREWLITE COFFEE
            </div>
            <h2>
              Thực đơn <em>dành cho bạn</em>
            </h2>
            <p>Những hương vị quen thuộc, được chuẩn bị thật chỉn chu.</p>
          </div>

          <label className="bl-menu-search">
            <span>⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm món bạn thích..."
              aria-label="Tìm món bạn thích"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </label>
        </div>

        <div className="bl-menu-filter" aria-label="Lọc danh mục">
          {categories.map((c) => (
            <button
              key={c.slug}
              type="button"
              className={category === c.slug ? "active" : ""}
              onClick={() => setCategory(c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="bl-menu-results">
          <span>
            {loading ? "Đang tải thực đơn..." : `${filtered.length} món`}
          </span>
          <span>Được chuẩn bị tươi mới mỗi ngày</span>
        </div>

        {loading ? (
          <div className="bl-menu-empty">
            <span>☕</span>
            <h3>Đang tải thực đơn</h3>
            <p>Vui lòng chờ trong giây lát.</p>
          </div>
        ) : loadError ? (
          <div className="bl-menu-empty">
            <span>!</span>
            <h3>Chưa kết nối được thực đơn</h3>
            <p>
              {loadError} Hãy kiểm tra NestJS API và cấu hình
              NEXT_PUBLIC_API_URL.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Thử lại
            </button>
          </div>
        ) : filtered.length ? (
          <div className="bl-menu-grid">
            {filtered.map((p) => (
              <article className="bl-menu-card" key={p.id}>
                <button
                  type="button"
                  className="bl-menu-card-image"
                  onClick={() => openProduct(p)}
                  aria-label={`Xem chi tiết ${p.name}`}
                >
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                    />
                  ) : (
                    <span className="bl-menu-no-image">☕</span>
                  )}

                  {p.tag && <span className="bl-menu-tag">{p.tag}</span>}
                  <span className="bl-menu-image-arrow">↗</span>
                </button>

                <div className="bl-menu-card-body">
                  <span className="bl-menu-category">{p.category}</span>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>

                  <div className="bl-menu-card-footer">
                    <strong>{money(p.price)}</strong>
                    <button type="button" onClick={() => openProduct(p)}>
                      Chọn món <span>＋</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="bl-menu-empty">
            <span>⌕</span>
            <h3>Chưa tìm thấy món phù hợp</h3>
            <p>Thử một từ khóa khác hoặc chọn danh mục khác nhé.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("all");
              }}
            >
              Xem tất cả món
            </button>
          </div>
        )}
      </section>

      <section className="bl-menu-promise">
        <div>
          <span>✦</span>
          <strong>Nguyên liệu chọn lọc</strong>
          <p>Chăm chút từ hạt cà phê đến từng topping.</p>
        </div>
        <div>
          <span>◷</span>
          <strong>Đặt hàng đơn giản</strong>
          <p>Vài thao tác để có thức uống yêu thích.</p>
        </div>
        <div>
          <span>♡</span>
          <strong>Hương vị trọn vẹn</strong>
          <p>Mỗi ly đều được chuẩn bị khi bạn đặt.</p>
        </div>
      </section>

      {selected && (
        <div
          className="bl-menu-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeProduct();
          }}
        >
          <section
            className="bl-menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bl-modal-title"
          >
            <button
              className="bl-menu-modal-close"
              type="button"
              onClick={closeProduct}
              aria-label="Đóng"
            >
              ×
            </button>

            <div className="bl-menu-modal-image">
              {selected.image ? (
                <img src={selected.image} alt={selected.name} />
              ) : (
                <span className="bl-menu-no-image">☕</span>
              )}
            </div>

            <div className="bl-menu-modal-content">
              <span className="bl-menu-category">{selected.category}</span>
              <h2 id="bl-modal-title">{selected.name}</h2>
              <p>{selected.description}</p>

              <div className="bl-menu-modal-options">
                {selected.sizes.length > 0 && (
                  <div className="bl-menu-option">
                    <div className="bl-menu-option-title">Chọn size</div>
                    <div className="bl-menu-choice">
                      {selected.sizes.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          className={size === s.code ? "selected" : ""}
                          onClick={() => setSize(s.code)}
                        >
                          {s.name}
                          <small>{money(s.price)}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!isCake(selected) && (
                  <>
                    <div className="bl-menu-option">
                      <div className="bl-menu-option-title">Đường</div>
                      <div className="bl-menu-choice">
                        {["0%", "50%", "100%"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={sugar === s ? "selected" : ""}
                            onClick={() => setSugar(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bl-menu-option">
                      <div className="bl-menu-option-title">Đá</div>
                      <div className="bl-menu-choice">
                        {["Không đá", "50%", "100%"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={ice === s ? "selected" : ""}
                            onClick={() => setIce(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {availableToppings.length > 0 ? (
                      <div className="bl-menu-option">
                        <div className="bl-menu-option-title">Topping</div>
                        <div className="bl-menu-choice">
                          {availableToppings.map((t) => (
                            <button
                              key={t.id ?? t.name}
                              type="button"
                              className={
                                toppings.includes(t.name) ? "selected" : ""
                              }
                              onClick={() =>
                                setToppings((old) =>
                                  old.includes(t.name)
                                    ? old.filter((x) => x !== t.name)
                                    : [...old, t.name]
                                )
                              }
                            >
                              {t.name}
                              <small>{money(t.price)}</small>
                              {toppings.includes(t.name) ? " ✓" : " ＋"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="bl-menu-topping-hint">
                        Chưa nhận được danh sách topping từ API cho món này.
                        Nếu đây không phải món bánh, hãy kiểm tra API
                        /menu/products đã trả trường toppings chưa và kiểm tra
                        liên kết trong bảng menu_product_toppings.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="bl-menu-modal-footer">
                <div className="bl-menu-modal-bottom">
                  <div className="bl-menu-total">
                    <small>Tổng tiền</small>
                    <strong>{money(currentPrice)}</strong>
                  </div>
                  <button type="button" onClick={addToCart}>
                    Thêm vào giỏ hàng <span>＋</span>
                  </button>
                </div>
                <small className="bl-menu-cart-hint">
                  Giỏ hàng được lưu tạm trên trình duyệt này.
                </small>
              </div>
            </div>
          </section>
        </div>
      )}

      {notice && (
        <div className="bl-menu-toast">
          <span>✓</span>
          {notice}
          <Link href="/cart">Xem giỏ hàng →</Link>
        </div>
      )}
    </main>
  );
}
