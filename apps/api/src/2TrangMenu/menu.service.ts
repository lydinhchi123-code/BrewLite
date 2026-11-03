
import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';

export interface MenuCategoryRow {
  id: number | string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
}

export interface MenuSizeRow {
  id: number | string;
  size_code: string;
  size_name: string;
  price: number | string;
}

export interface MenuToppingRow {
  id: number | string;
  name: string;
  price: number | string;
}

export interface MenuProductRow {
  id: number | string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  base_price: number | string;
  is_featured: boolean;
  is_available: boolean;
  display_order: number;
  category_id: number | string | null;
  category_name: string | null;
  category_slug: string | null;
  sizes: MenuSizeRow[];
  toppings: MenuToppingRow[];
}

@Injectable()
export class MenuService implements OnModuleInit, OnModuleDestroy {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  });

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        'Thiếu DATABASE_URL. Hãy khai báo chuỗi kết nối PostgreSQL trong file .env.',
      );
    }

    try {
      await this.pool.query('SELECT 1');
    } catch (error: unknown) {
      throw new Error(
        `Không thể kết nối PostgreSQL. Hãy kiểm tra DATABASE_URL và trạng thái PostgreSQL. Chi tiết: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /**
   * Lấy danh sách danh mục đang hoạt động.
   */
  async getCategories(): Promise<MenuCategoryRow[]> {
    try {
      const result = await this.pool.query<MenuCategoryRow>(`
        SELECT
          id,
          name,
          slug,
          description,
          image_url,
          display_order
        FROM menu_categories
        WHERE is_active = TRUE
        ORDER BY display_order ASC, name ASC
      `);

      return result.rows;
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * Lấy danh sách sản phẩm, size và topping.
   */
  async getProducts() {
    try {
      const result = await this.pool.query<MenuProductRow>(`
        SELECT
          p.id,
          p.name,
          p.slug,
          p.description,
          p.image_url,
          p.base_price,
          p.is_featured,
          p.is_available,
          p.display_order,

          c.id AS category_id,
          c.name AS category_name,
          c.slug AS category_slug,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', s.id,
                  'size_code', s.size_code,
                  'size_name', s.size_name,
                  'price', s.price
                )
                ORDER BY s.display_order ASC, s.id ASC
              )
              FROM menu_product_sizes s
              WHERE s.product_id = p.id
                AND s.is_available = TRUE
            ),
            '[]'::json
          ) AS sizes,

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', t.id,
                  'name', t.name,
                  'price', t.price
                )
                ORDER BY t.display_order ASC, t.id ASC
              )
              FROM menu_toppings t
              WHERE t.is_available = TRUE
                AND c.slug <> 'banh'
            ),
            '[]'::json
          ) AS toppings

        FROM menu_products p
        LEFT JOIN menu_categories c
          ON c.id = p.category_id

        WHERE p.is_available = TRUE
          AND (c.id IS NULL OR c.is_active = TRUE)

        ORDER BY p.display_order ASC, p.name ASC
      `);

      return result.rows.map((row) => ({
        ...row,
        id: Number(row.id),
        basePrice: Number(row.base_price),
        imageUrl: row.image_url,
        isFeatured: row.is_featured,

        categoryId:
          row.category_id === null
            ? null
            : Number(row.category_id),

        categoryName: row.category_name,
        categorySlug: row.category_slug,

        category: row.category_id
          ? {
              id: Number(row.category_id),
              name: row.category_name,
              slug: row.category_slug,
            }
          : null,

        sizes: (row.sizes ?? []).map((size) => ({
          ...size,
          id: Number(size.id),
          price: Number(size.price),
        })),

        toppings: (row.toppings ?? []).map((topping) => ({
          ...topping,
          id: Number(topping.id),
          price: Number(topping.price),
        })),
      }));
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * Lấy danh sách nguyên liệu và tồn kho dành cho Admin.
   */
  async getInventory() {
    try {
      const result = await this.pool.query(`
        SELECT
          i.id,
          i.name,
          i.base_unit AS "baseUnit",
          i.description,
          i.is_active AS "isActive",

          COALESCE(inv.stock_quantity, 0) AS "stockQuantity",
          COALESCE(inv.low_stock_threshold, 0) AS "lowStockThreshold",

          CASE
            WHEN i.is_active = FALSE THEN 'NGUNG_HOAT_DONG'
            WHEN COALESCE(inv.stock_quantity, 0) = 0 THEN 'HET_HANG'
            WHEN COALESCE(inv.stock_quantity, 0)
                 <= COALESCE(inv.low_stock_threshold, 0)
              THEN 'SAP_HET_HANG'
            ELSE 'CON_HANG'
          END AS "inventoryStatus",

          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ip.id,
                  'packageName', ip.package_name,
                  'quantityPerPackage', ip.quantity_per_package,
                  'packageUnit', ip.package_unit,
                  'isActive', ip.is_active
                )
                ORDER BY ip.id ASC
              )
              FROM ingredient_packaging ip
              WHERE ip.ingredient_id = i.id
                AND ip.is_active = TRUE
                AND ip.package_unit = i.base_unit
            ),
            '[]'::json
          ) AS packaging

        FROM ingredients i

        LEFT JOIN ingredient_inventory inv
          ON inv.ingredient_id = i.id

        ORDER BY i.name ASC
      `);

      return result.rows.map((row: {
        id: number | string;
        name: string;
        baseUnit: string;
        description: string | null;
        isActive: boolean;
        stockQuantity: number | string;
        lowStockThreshold: number | string;
        inventoryStatus: string;
        packaging: {
          id: number | string;
          packageName: string;
          quantityPerPackage: number | string;
          packageUnit: string;
          isActive: boolean;
        }[];
      }) => ({
        id: Number(row.id),
        name: row.name,
        baseUnit: row.baseUnit,
        description: row.description,
        isActive: row.isActive,
        stockQuantity: Number(row.stockQuantity),
        lowStockThreshold: Number(row.lowStockThreshold),
        inventoryStatus: row.inventoryStatus,

        packaging: (row.packaging ?? []).map((item) => ({
          id: Number(item.id),
          packageName: item.packageName,
          quantityPerPackage: Number(item.quantityPerPackage),
          packageUnit: item.packageUnit,
          isActive: item.isActive,
        })),
      }));
    } catch (error: unknown) {
      this.handleDatabaseError(error);
    }
  }

  /**
   * Cập nhật số lượng tồn kho của nguyên liệu.
   *
   * Ghi lịch sử điều chỉnh vào ingredient_transactions.
   * Nếu cập nhật kho hoặc ghi lịch sử thất bại,
   * toàn bộ transaction sẽ được rollback.
   */
  async updateInventory(id: number, stockQuantity: number) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException(
        'ID nguyên liệu không hợp lệ.',
      );
    }

    if (
      typeof stockQuantity !== 'number' ||
      !Number.isFinite(stockQuantity) ||
      stockQuantity < 0 ||
      !/^\d+(\.\d{1,3})?$/.test(String(stockQuantity))
    ) {
      throw new BadRequestException(
        'Số lượng tồn kho phải là số không âm, tối đa 3 chữ số thập phân.',
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const ingredientResult = await client.query(
        `
        SELECT id, name, base_unit, is_active
        FROM ingredients
        WHERE id = $1
        FOR UPDATE
        `,
        [id],
      );

      if (ingredientResult.rowCount === 0) {
        throw new NotFoundException(
          'Không tìm thấy nguyên liệu.',
        );
      }

      const ingredient = ingredientResult.rows[0];

      // Đảm bảo nguyên liệu có dòng tồn kho trước khi cập nhật.
      // Giá trị mặc định của ngưỡng được lấy từ cấu trúc bảng.
      await client.query(
        `
        INSERT INTO ingredient_inventory (
          ingredient_id,
          stock_quantity
        )
        VALUES ($1, 0)
        ON CONFLICT (ingredient_id) DO NOTHING
        `,
        [id],
      );

      const inventoryResult = await client.query(
        `
        SELECT stock_quantity, low_stock_threshold
        FROM ingredient_inventory
        WHERE ingredient_id = $1
        FOR UPDATE
        `,
        [id],
      );

      const oldQuantity = Number(
        inventoryResult.rows[0].stock_quantity,
      );

      const lowStockThreshold = Number(
        inventoryResult.rows[0].low_stock_threshold,
      );

      const difference = stockQuantity - oldQuantity;

      await client.query(
        `
        UPDATE ingredient_inventory
        SET stock_quantity = $1,
            updated_at = NOW()
        WHERE ingredient_id = $2
        `,
        [stockQuantity, id],
      );

      // Chỉ ghi lịch sử khi số lượng thực sự thay đổi.
      if (difference !== 0) {
        await client.query(
          `
          INSERT INTO ingredient_transactions (
            ingredient_id,
            transaction_type,
            quantity,
            unit,
            reference_type,
            reference_id,
            note
          )
          VALUES ($1, $2, $3, $4, $5, NULL, $6)
          `,
          [
            id,
            difference > 0 ? 'ADJUST_IN' : 'ADJUST_OUT',
            Math.abs(difference),
            ingredient.base_unit,
            'MANUAL_ADJUSTMENT',
            `Điều chỉnh tồn kho từ ${oldQuantity} thành ${stockQuantity}.`,
          ],
        );
      }

      await client.query('COMMIT');

      return {
        message: 'Cập nhật tồn kho nguyên liệu thành công.',
        ingredient: {
          id: Number(ingredient.id),
          name: ingredient.name,
          baseUnit: ingredient.base_unit,
          stockQuantity,
          lowStockThreshold,
          inventoryStatus:
            stockQuantity === 0
              ? 'HET_HANG'
              : stockQuantity <= lowStockThreshold
                ? 'SAP_HET_HANG'
                : 'CON_HANG',
        },
      };
    } catch (error: unknown) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: unknown) {
        console.error(
          'Lỗi rollback khi cập nhật tồn kho:',
          rollbackError,
        );
      }

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      this.handleDatabaseError(error);
    } finally {
      client.release();
    }
  }

  /**
   * Chuyển lỗi truy vấn PostgreSQL thành lỗi API dễ đọc.
   */
  private handleDatabaseError(error: unknown): never {
    const message =
      error instanceof Error ? error.message : String(error);

    throw new ServiceUnavailableException(
      `Không thể xử lý dữ liệu menu hoặc tồn kho. Hãy kiểm tra DATABASE_URL và các bảng menu_categories, menu_products, menu_product_sizes, menu_toppings, ingredients, ingredient_inventory, ingredient_transactions. Chi tiết: ${message}`,
    );
  }
}
