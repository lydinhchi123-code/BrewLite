
"use client";

import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  imageUrl?: string;
  image?: string;
  base_price?: number | string;
  basePrice?: number | string;
  price?: number | string;
  category?: string | { name?: string; slug?: string };
  categoryName?: string;
  categorySlug?: string;
  is_available?: boolean;
  isAvailable?: boolean;
}

interface Ingredient {
  ingredientId: number;
  ingredientName: string;
  quantity: number;
  unit: string;
  note?: string;
}

interface RecipeStep {
  stepNumber: number;
  instruction: string;
}

interface Recipe {
  recipeId: number;
  productId: number;
  recipeName: string;
  version: number;
  notes?: string;
  preparationTime?: number;
  sizeId: number | null;
  sizeCode: string | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
}


function getCategory(product: Product) {
  if (typeof product.category === "string") {
    return product.category;
  }

  return (
    product.category?.name ||
    product.categoryName ||
    product.category?.slug ||
    product.categorySlug ||
    "Chưa phân loại"
  );
}

function getImage(product: Product) {
  return product.image_url || product.imageUrl || product.image || "";
}

function getPrice(product: Product) {
  return Number(product.base_price ?? product.basePrice ?? product.price ?? 0);
}

export default function CongThucPhaChePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const [loading, setLoading] = useState(true);
  const [recipeLoading, setRecipeLoading] = useState(false);

  const [error, setError] = useState("");
  const [recipeError, setRecipeError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/menu/products`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`API trả về HTTP ${response.status}`);
        }

        const data = await response.json();

        const list: Product[] = Array.isArray(data)
          ? data
          : Array.isArray(data.products)
            ? data.products
            : Array.isArray(data.data)
              ? data.data
              : [];

        setProducts(list);

        if (list.length === 0) {
          setError("API chưa trả về danh sách món. Hãy kiểm tra dữ liệu menu.");
        }
      } catch (err) {
        console.error("Lỗi tải menu:", err);
        setError(
          "Không tải được menu. Hãy kiểm tra backend và API /menu/products."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    Promise.resolve().then(async () => {
      if (!active) return;

      if (!selected) {
        setRecipes([]);
        setSelectedRecipe(null);
        setRecipeError("");
        setRecipeLoading(false);
        return;
      }

      try {
        setRecipeLoading(true);
        setRecipeError("");

        setRecipes([]);
        setSelectedRecipe(null);

        const response = await fetch(
          `${API_URL}/recipes/products/${selected.id}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`API trả về HTTP ${response.status}`);
        }

        const result = await response.json();

        const list: Recipe[] = Array.isArray(result)
          ? result
          : Array.isArray(result.data)
            ? result.data
            : [];

        if (!active) return;

        setRecipes(list);

        console.log(
          "DỮ LIỆU CÁC SIZE:",
          list.map((recipe) => ({
            recipeId: recipe.recipeId,
            sizeCode: recipe.sizeCode,
            ingredients: recipe.ingredients.length,
            steps: recipe.steps,
          }))
        );

        if (list.length > 0) {
          // Ưu tiên công thức size S; nếu không có thì lấy công thức đầu tiên.
          const defaultRecipe =
            list.find((recipe) => recipe.sizeCode === "S") || list[0];

          setSelectedRecipe(defaultRecipe);
        }
      } catch (err) {
        if (!active || controller.signal.aborted) return;

        console.error("Lỗi tải công thức:", err);
        setRecipeError(
          "Không tải được công thức. Hãy kiểm tra API /recipes."
        );
      } finally {
        if (active) {
          setRecipeLoading(false);
        }
      }
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [selected]);

  const categories = useMemo(
    () => [
      "all",
      ...Array.from(new Set(products.map(getCategory))),
    ],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesCategory =
        category === "all" || getCategory(product) === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  return (
    <div className="recipe-page">
      <style jsx>{`
        .recipe-page {
          color: #38291f;
        }

        .recipe-heading {
          margin-bottom: 24px;
        }

        .recipe-heading h1 {
          margin: 0 0 8px;
          font-size: clamp(25px, 3vw, 32px);
          color: #543b2d;
        }

        .recipe-heading p {
          margin: 0;
          color: #81776d;
          font-size: 14px;
          line-height: 1.7;
        }

        .recipe-layout {
          display: grid;
          grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.3fr);
          gap: 22px;
          align-items: start;
        }

        .recipe-panel {
          min-width: 0;
          background: #fff;
          border: 1px solid #eee7df;
          border-radius: 16px;
          overflow: hidden;
        }

        .panel-heading {
          padding: 18px 20px;
          border-bottom: 1px solid #eee7df;
        }

        .panel-heading h2 {
          margin: 0 0 5px;
          font-size: 17px;
        }

        .panel-heading p {
          margin: 0;
          font-size: 12px;
          color: #81776d;
        }

        .recipe-controls {
          display: grid;
          gap: 10px;
          padding: 14px 16px;
        }

        .recipe-controls input,
        .recipe-controls select {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding: 11px 12px;
          border: 1px solid #e6ddd3;
          border-radius: 9px;
          background: #fff;
          color: #38291f;
          font: inherit;
          font-size: 13px;
          outline-color: #785640;
        }

        .product-list {
          display: grid;
          gap: 7px;
          padding: 0 12px 14px;
          max-height: 620px;
          overflow-y: auto;
        }

        .product-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 11px;
          border: 1px solid transparent;
          border-radius: 11px;
          background: #fff;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }

        .product-item:hover {
          background: #faf6f1;
        }

        .product-item.active {
          background: #f7efe7;
          border-color: #cbb39e;
        }

        .product-image {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 55px;
          height: 55px;
          border-radius: 9px;
          overflow: hidden;
          background: #f4ede5;
          color: #785640;
          font-size: 23px;
        }

        .product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-info {
          min-width: 0;
          flex: 1;
        }

        .product-info strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .product-info span {
          color: #81776d;
          font-size: 12px;
        }

        .product-arrow {
          color: #9a8877;
          font-size: 19px;
        }

        .detail-body {
          padding: 20px;
        }

        .empty-detail {
          display: grid;
          place-items: center;
          min-height: 300px;
          padding: 30px;
          text-align: center;
          color: #81776d;
        }

        .empty-detail .cup {
          margin-bottom: 12px;
          font-size: 42px;
        }

        .detail-title {
          margin: 0 0 7px;
          color: #543b2d;
          font-size: 24px;
          overflow-wrap: anywhere;
        }

        .detail-description {
          margin: 0 0 17px;
          color: #81776d;
          font-size: 13px;
          line-height: 1.7;
        }

        /* Thông tin danh mục và giá */
        .detail-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .detail-tag {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          min-height: 30px;
          padding: 6px 10px;
          border-radius: 8px;
          background: #f7f2ec;
          color: #785640;
          font-size: 12px;
          line-height: 1.4;
        }

        /* Chọn size công thức */
        .size-selector {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin: 16px 0 22px;
        }

        .size-selector label {
          color: #38291f;
          font-size: 13px;
          font-weight: 600;
        }

        .size-selector select {
          box-sizing: border-box;
          width: 100%;
          max-width: 260px;
          height: 42px;
          padding: 0 38px 0 14px;
          border: 1px solid #d8c8b9;
          border-radius: 10px;
          background-color: #fff;
          color: #38291f;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          appearance: none;

          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23785640' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 16px;
        }

        .size-selector select:hover {
          border-color: #785640;
        }

        .size-selector select:focus {
          border-color: #785640;
          box-shadow: 0 0 0 3px rgba(120, 86, 64, 0.12);
        }

        /* Các phần nội dung công thức */
        .recipe-section {
          margin-top: 22px;
        }

        .recipe-section h3 {
          margin: 0 0 13px;
          font-size: 16px;
        }

        .ingredient-list {
          display: grid;
          gap: 0;
        }

        .ingredient-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f0ebe5;
          font-size: 13px;
        }

        .ingredient-row span:last-child {
          flex-shrink: 0;
          color: #785640;
          font-weight: 700;
        }

        /* Danh sách các bước pha chế */
        .step-list {
          display: grid;
          gap: 13px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .step-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 13px;
          line-height: 1.7;
        }

        .step-number {
          display: grid;
          place-items: center;
          flex-shrink: 0;
          width: 27px;
          height: 27px;
          border-radius: 50%;
          background: #785640;
          color: white;
          font-size: 12px;
          font-weight: 700;
        }

        /* Ghi chú và thông báo */
        .recipe-message {
          padding: 18px;
          color: #81776d;
          font-size: 13px;
          line-height: 1.7;
        }

        .recipe-error {
          color: #b42318;
        }

        /* Responsive: máy tính bảng */
        @media (max-width: 850px) {
          .recipe-layout {
            grid-template-columns: 1fr;
          }

          .product-list {
            max-height: 350px;
          }
        }

        /* Responsive: điện thoại */
        @media (max-width: 480px) {
          .detail-body {
            padding: 15px;
          }

          .detail-title {
            font-size: 21px;
          }

          .product-image {
            width: 47px;
            height: 47px;
          }

          .size-selector select {
            max-width: 100%;
          }

          .step-item {
            gap: 10px;
            font-size: 12px;
          }
        }
      `}</style>


      <section className="admin-page-heading">
        <div>  
          <h1>Công thức pha chế</h1>
          <p>
            Tra cứu nguyên liệu, định lượng và quy trình chuẩn bị cho từng món trong thực đơn BrewLite.
          </p>
        </div>
      </section>

      {error && (
        <div
          className={`recipe-message ${products.length === 0 ? "recipe-error" : ""}`}
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="recipe-layout">
        <section className="recipe-panel">
          <div className="panel-heading">
            <h2>Danh sách món</h2>
            <p>
              {loading
                ? "Đang tải thực đơn..."
                : `${filteredProducts.length} món`}
            </p>
          </div>

          <div className="recipe-controls">
            <input
              type="search"
              placeholder="Tìm tên món..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Tìm món trong thực đơn"
            />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Lọc theo danh mục"
            >
              <option value="all">Tất cả danh mục</option>
              {categories
                .filter((item) => item !== "all")
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </div>

          {loading ? (
            <div className="recipe-message">Đang tải danh sách món...</div>
          ) : (
            <div className="product-list">
              {filteredProducts.map((product) => {
                const image = getImage(product);
                const active = selected?.id === product.id;

                return (
                  <button
                    type="button"
                    key={product.id}
                    className={`product-item ${active ? "active" : ""}`}
                    onClick={() => setSelected(product)}
                    aria-pressed={active}
                  >
                    <div className="product-image">
                      {image ? (
                        <img src={image} alt={product.name} />
                      ) : (
                        "☕"
                      )}
                    </div>

                    <div className="product-info">
                      <strong>{product.name}</strong>
                      <span>{getCategory(product)}</span>
                    </div>

                    <span className="product-arrow">›</span>
                  </button>
                );
              })}

              {!loading && filteredProducts.length === 0 && (
                <div className="recipe-message">
                  Không tìm thấy món phù hợp.
                </div>
              )}
            </div>
          )}
        </section>

        <section className="recipe-panel">
          <div className="panel-heading">
            <h2>Chi tiết công thức</h2>
            <p>Chọn một món ở danh sách để xem hướng dẫn.</p>
          </div>

          {!selected ? (
            <div className="empty-detail">
              <div>
                <div className="cup">☕</div>
                <strong>Chưa chọn món</strong>
                <p>
                  Chọn món trong danh sách bên trái để xem
                  nguyên liệu và các bước pha chế.
                </p>
              </div>
            </div>
          ) : (
            <div className="detail-body">
              <h2 className="detail-title">{selected.name}</h2>

              <p className="detail-description">
                {selected.description ||
                  "Công thức tham khảo cho món trong thực đơn BrewLite."}
              </p>

              <div className="detail-tags">
                <span className="detail-tag">
                  {getCategory(selected)}
                </span>

                <span className="detail-tag">
                  Giá: {getPrice(selected).toLocaleString("vi-VN")} đ
                </span>

                {selectedRecipe?.preparationTime && (
                  <span className="detail-tag">
                    Thời gian chuẩn bị: {selectedRecipe.preparationTime} phút
                  </span>
                )}
              </div>

              {recipes.length > 0 && (
                <div className="size-selector">
                  <label htmlFor="recipe-size">Chọn size công thức</label>

                  <select
                    id="recipe-size"
                    value={selectedRecipe?.recipeId ?? ""}
                    onChange={(event) => {
                      const recipe = recipes.find(
                        (item) => Number(item.recipeId) === Number(event.target.value)
                      );

                      console.log("SIZE ĐƯỢC CHỌN:", recipe);
                      console.log("CÁC BƯỚC:", recipe?.steps);

                      setSelectedRecipe(recipe || null);
                    }}
                  >
                    {recipes.map((recipe) => (
                      <option key={recipe.recipeId} value={recipe.recipeId}>
                        {recipe.sizeCode
                          ? `Size ${recipe.sizeCode}`
                          : "Công thức mặc định"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {recipeLoading ? (
                <div className="recipe-message">
                  Đang tải công thức từ cơ sở dữ liệu...
                </div>
              ) : recipeError ? (
                <div className="recipe-message recipe-error">
                  {recipeError}
                </div>
              ) : selectedRecipe ? (
                <>
                  <section className="recipe-section">
                    <h3>🧾 Nguyên liệu và định lượng</h3>

                    {selectedRecipe.ingredients.length > 0 ? (
                      <div className="ingredient-list">
                        {selectedRecipe.ingredients.map((ingredient) => (
                          <div
                            className="ingredient-row"
                            key={ingredient.ingredientId}
                          >
                            <div>
                              <span>{ingredient.ingredientName}</span>

                              {ingredient.note && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    color: "#81776d",
                                    fontSize: 11,
                                  }}
                                >
                                  {ingredient.note}
                                </div>
                              )}
                            </div>

                            <span>
                              {ingredient.quantity.toLocaleString("vi-VN")}{" "}
                              {ingredient.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="recipe-message">
                        Công thức này chưa có nguyên liệu.
                      </div>
                    )}
                  </section>

                  {selectedRecipe.steps && selectedRecipe.steps.length > 0 ? (
                    <section className="recipe-section">
                      <h3>👨‍🍳 Các bước thực hiện</h3>

                      <ol className="step-list">
                        {[...selectedRecipe.steps]
                          .sort((a, b) => a.stepNumber - b.stepNumber)
                          .map((step) => (
                            <li className="step-item" key={step.stepNumber}>
                              <span className="step-number">{step.stepNumber}</span>
                              <span>{step.instruction}</span>
                            </li>
                          ))}
                      </ol>
                    </section>
                  ) : (
                    <div className="recipe-message">
                      Công thức này chưa có quy trình thực hiện.
                    </div>
                  )}
                </>
              ) : (
                <div className="recipe-message">
                  Món này chưa có công thức trong cơ sở dữ liệu.
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
