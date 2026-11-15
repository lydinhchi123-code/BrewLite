"use client";

export type ProductCardItem = {
  id: number | string;
  name: string;
  description: string;
  price: number;
  image: string;
  category?: string;
  badge?: string;
};

type ProductCardProps = {
  product: ProductCardItem;
  onViewDetail?: (product: ProductCardItem) => void;
  onAddToCart?: (product: ProductCardItem) => void;
};

export default function ProductCard({
  product,
  onViewDetail,
  onAddToCart,
}: ProductCardProps) {
  const formatPrice = (price: number) =>
    price.toLocaleString("vi-VN") + "đ";

  return (
    <article className="product-card">
      <div className="product-image-wrap">
        <img
          src={product.image}
          alt={product.name}
          className="product-image"
        />

        {product.badge && (
          <span className="product-badge">
            {product.badge}
          </span>
        )}
      </div>

      <div className="product-info">
        {product.category && (
          <span className="product-category">
            {product.category}
          </span>
        )}

        <h3 className="product-name">
          {product.name}
        </h3>

        <p className="product-description">
          {product.description}
        </p>

        <div className="product-footer">
          <strong className="product-price">
            {formatPrice(product.price)}
          </strong>

          <div className="product-actions">
            {onViewDetail && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => onViewDetail(product)}
              >
                Chi tiết
              </button>
            )}

            {onAddToCart && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onAddToCart(product)}
              >
                + Thêm
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}