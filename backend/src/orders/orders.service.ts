
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Pool, PoolClient } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderStatus,
  assertTransition,
} from './order-state-machine';

interface RequiredIngredient {
  ingredientId: number;
  name: string;
  unit: string;
  quantity: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const {
      items,
      customerName,
      customerPhone,
      address,
      phuong,
      subtotal,
      deliveryFee = 0,
      discount = 0,
      totalAmount,
      note,
      makh,
    } = createOrderDto;

    if (
      makh == null ||
      !Number.isSafeInteger(Number(makh)) ||
      Number(makh) < 1
    ) {
      throw new BadRequestException(
        'Không xác định được khách hàng. Vui lòng đăng nhập lại.',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException(
        'Đơn hàng phải có ít nhất một món.',
      );
    }

    // Kiểm tra số lượng và giá của từng món.
    for (const item of items) {
      if (
        !Number.isSafeInteger(Number(item.id)) ||
        Number(item.id) <= 0
      ) {
        throw new BadRequestException(
          `ID sản phẩm không hợp lệ: ${item.id}`,
        );
      }

      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        throw new BadRequestException(
          'Số lượng mỗi món phải là số nguyên dương.',
        );
      }

      if (
        !Number.isFinite(item.price) ||
        item.price < 0
      ) {
        throw new BadRequestException(
          'Đơn giá sản phẩm không hợp lệ.',
        );
      }
    }

    if (
      !Number.isFinite(subtotal) ||
      !Number.isFinite(deliveryFee) ||
      !Number.isFinite(discount) ||
      !Number.isFinite(totalAmount) ||
      deliveryFee < 0 ||
      discount < 0
    ) {
      throw new BadRequestException(
        'Thông tin thanh toán không hợp lệ.',
      );
    }

    const expectedTotal =
      subtotal + deliveryFee - discount;

    if (
      expectedTotal < 0 ||
      Math.abs(expectedTotal - totalAmount) > 0.001
    ) {
      throw new BadRequestException(
        'Tổng tiền không hợp lệ.',
      );
    }

    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (
      Math.abs(calculatedSubtotal - subtotal) > 0.001
    ) {
      throw new BadRequestException(
        'Tạm tính không khớp với chi tiết đơn hàng.',
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const displayOrderId =
        `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // 1. Tạo đơn hàng trong transaction.
      const orderResult = await client.query(
        `
        INSERT INTO donhang (
          madonhanghienthi,
          makh,
          hotennguoinhan,
          sodienthoainguoinhan,
          diachigiaohang,
          phuong,
          ghichu,
          tamtinh,
          phigiaohang,
          giamgia,
          tongtien
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11
        )
        RETURNING *
        `,
        [
          displayOrderId,
          Number(makh),
          customerName,
          customerPhone,
          address,
          phuong,
          note ?? null,
          subtotal,
          deliveryFee,
          discount,
          totalAmount,
        ],
      );

      const order = orderResult.rows[0];

      let hasProductStockDeduction = false;

      // Gom nguyên liệu cần dùng cho toàn bộ đơn hàng.
      const requiredIngredients = new Map<
        number,
        RequiredIngredient
      >();

      // 2. Kiểm tra sản phẩm, công thức và tạo chi tiết đơn.
      for (const item of items) {
        const productId = Number(item.id);

        const productResult = await client.query(
          `
          SELECT
            id,
            name,
            image_url,
            is_available,
            stock_quantity,
            track_inventory
          FROM menu_products
          WHERE id = $1
          FOR UPDATE
          `,
          [productId],
        );

        if (productResult.rowCount === 0) {
          throw new NotFoundException(
            `Không tìm thấy sản phẩm ID ${productId}.`,
          );
        }

        const product = productResult.rows[0];

        if (!product.is_available) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" hiện không được bán.`,
          );
        }

        // 3. Nếu là sản phẩm quản lý tồn kho thành phẩm,
        // tiếp tục trừ tồn kho thành phẩm như logic cũ.
        let stockDeducted = false;

        if (product.track_inventory) {
          const stock = Number(product.stock_quantity);

          if (stock < item.quantity) {
            throw new BadRequestException(
              `Sản phẩm "${product.name}" không đủ hàng. ` +
              `Tồn kho: ${stock}, yêu cầu: ${item.quantity}.`,
            );
          }

          const stockResult = await client.query(
            `
            UPDATE menu_products
            SET stock_quantity = stock_quantity - $1
            WHERE id = $2
              AND stock_quantity >= $1
            RETURNING id
            `,
            [item.quantity, productId],
          );

          if (stockResult.rowCount === 0) {
            throw new BadRequestException(
              `Sản phẩm "${product.name}" không còn đủ hàng.`,
            );
          }

          stockDeducted = true;
          hasProductStockDeduction = true;
        }

        // 4. Lấy công thức mặc định của sản phẩm.
        // Hiện DTO chưa có size_id nên dùng size_id IS NULL.
        const recipeResult = await client.query(
          `
          SELECT id
          FROM recipes
          WHERE product_id = $1
            AND size_id IS NULL
            AND is_active = TRUE
          ORDER BY version DESC, id DESC
          LIMIT 1
          `,
          [productId],
        );

        if (recipeResult.rowCount === 0) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" chưa có công thức nguyên liệu mặc định. Không thể tạo đơn hàng.`,
          );
        }

        const recipeId = Number(recipeResult.rows[0].id);

        const detailsResult = await client.query(
          `
          SELECT
            rd.ingredient_id,
            i.name AS ingredient_name,
            rd.quantity,
            rd.unit,
            i.base_unit
          FROM recipe_details rd
          JOIN ingredients i
            ON i.id = rd.ingredient_id
          WHERE rd.recipe_id = $1
            AND i.is_active = TRUE
          ORDER BY rd.ingredient_id
          `,
          [recipeId],
        );

        if (detailsResult.rowCount === 0) {
          throw new BadRequestException(
            `Công thức của "${product.name}" chưa có nguyên liệu.`,
          );
        }

        for (const detail of detailsResult.rows) {
          // Đơn vị trong công thức phải khớp đơn vị cơ sở
          // của nguyên liệu để tránh trừ sai lượng.
          if (detail.unit !== detail.base_unit) {
            throw new BadRequestException(
              `Đơn vị của nguyên liệu "${detail.ingredient_name}" không khớp đơn vị cơ sở. Công thức: ${detail.unit}, nguyên liệu: ${detail.base_unit}.`,
            );
          }

          const ingredientId = Number(
            detail.ingredient_id,
          );

          const needed =
            Number(detail.quantity) * item.quantity;

          if (!Number.isFinite(needed) || needed <= 0) {
            throw new BadRequestException(
              `Định lượng nguyên liệu "${detail.ingredient_name}" không hợp lệ.`,
            );
          }

          const existing =
            requiredIngredients.get(ingredientId);

          if (existing) {
            existing.quantity += needed;
          } else {
            requiredIngredients.set(ingredientId, {
              ingredientId,
              name: detail.ingredient_name,
              unit: detail.unit,
              quantity: needed,
            });
          }
        }

        const topping = item.topping?.length
          ? item.topping.join(', ')
          : null;

        await client.query(
          `
          INSERT INTO chitietdonhang (
            madonhang,
            product_id,
            tenmon,
            image_url,
            kichco,
            duong,
            da,
            topping,
            soluong,
            dongia,
            stock_deducted
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `,
          [
            order.madonhang,
            productId,
            product.name,
            product.image_url ?? null,
            item.size ?? null,
            item.sugar ?? null,
            item.ice ?? null,
            topping,
            item.quantity,
            item.price,
            stockDeducted,
          ],
        );
      }

      // 5. Khóa tồn kho nguyên liệu theo ID tăng dần.
      // Thứ tự cố định giúp giảm nguy cơ deadlock.
      const sortedIngredients = [
        ...requiredIngredients.values(),
      ].sort((a, b) => a.ingredientId - b.ingredientId);

      for (const ingredient of sortedIngredients) {
        const inventoryResult = await client.query(
          `
          SELECT
            i.name,
            i.base_unit,
            i.is_active,
            inv.stock_quantity
          FROM ingredients i
          LEFT JOIN ingredient_inventory inv
            ON inv.ingredient_id = i.id
          WHERE i.id = $1
          FOR UPDATE OF i
          `,
          [ingredient.ingredientId],
        );

        if (inventoryResult.rowCount === 0) {
          throw new NotFoundException(
            `Không tìm thấy nguyên liệu "${ingredient.name}".`,
          );
        }

        const inventory = inventoryResult.rows[0];

        if (!inventory.is_active) {
          throw new BadRequestException(
            `Nguyên liệu "${ingredient.name}" đã ngừng hoạt động.`,
          );
        }

        if (inventory.base_unit !== ingredient.unit) {
          throw new BadRequestException(
            `Đơn vị tồn kho của "${ingredient.name}" không khớp công thức.`,
          );
        }

        if (inventory.stock_quantity == null) {
          throw new BadRequestException(
            `Nguyên liệu "${ingredient.name}" chưa được khởi tạo tồn kho.`,
          );
        }

        const available = Number(inventory.stock_quantity);

        if (available < ingredient.quantity) {
          throw new BadRequestException(
            `Nguyên liệu "${ingredient.name}" không đủ tồn kho. ` +
            `Hiện có: ${available} ${ingredient.unit}, ` +
            `cần: ${ingredient.quantity} ${ingredient.unit}.`,
          );
        }
      }

      // 6. Đã kiểm tra đủ toàn bộ nguyên liệu.
      // Trừ kho và ghi lịch sử trong cùng transaction.
      for (const ingredient of sortedIngredients) {
        const stockResult = await client.query(
          `
          UPDATE ingredient_inventory
          SET stock_quantity = stock_quantity - $1,
              updated_at = NOW()
          WHERE ingredient_id = $2
            AND stock_quantity >= $1
          RETURNING stock_quantity
          `,
          [
            ingredient.quantity,
            ingredient.ingredientId,
          ],
        );

        if (stockResult.rowCount === 0) {
          throw new BadRequestException(
            `Nguyên liệu "${ingredient.name}" không còn đủ tồn kho.`,
          );
        }

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
          VALUES ($1, 'OUT', $2, $3, 'ORDER', $4, $5)
          `,
          [
            ingredient.ingredientId,
            ingredient.quantity,
            ingredient.unit,
            order.madonhang,
            `Xuất nguyên liệu cho đơn ${order.madonhanghienthi}.`,
          ],
        );
      }

      // Cột hiện tại chỉ đánh dấu việc trừ tồn kho thành phẩm.
      // Không dùng cột này để suy ra nguyên liệu đã được trừ.
      await client.query(
        `
        UPDATE donhang
        SET inventory_reserved = $1
        WHERE madonhang = $2
        `,
        [
          hasProductStockDeduction ||
            sortedIngredients.length > 0,
          order.madonhang,
        ],
      );

      await client.query('COMMIT');

      return {
        message: 'Tạo đơn hàng thành công!',
        orderId: order.madonhanghienthi,
        order,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        const dbError = error as Error & {
          code?: string;
          detail?: string;
          constraint?: string;
          table?: string;
          column?: string;
        };

        console.error('LỖI GỐC KHI TẠO ĐƠN HÀNG:', {
          message: dbError.message,
          code: dbError.code,
          detail: dbError.detail,
          constraint: dbError.constraint,
          table: dbError.table,
          column: dbError.column,
          stack: dbError.stack,
        });
      } else {
        console.error(
          'LỖI KHÔNG XÁC ĐỊNH KHI TẠO ĐƠN HÀNG:',
          error,
        );
      }

      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: unknown) {
        console.error(
          'LỖI ROLLBACK ĐƠN HÀNG:',
          rollbackError,
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  // Lấy danh sách đơn hàng kèm chi tiết.
  async findAll() {
    const result = await this.pool.query(`
      SELECT
        d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'mactdh', c.mactdh,
              'tenmon', c.tenmon,
              'image_url', c.image_url,
              'kichco', c.kichco,
              'duong', c.duong,
              'da', c.da,
              'topping', c.topping,
              'soluong', c.soluong,
              'dongia', c.dongia,
              'thanhtien', c.thanhtien
            )
            ORDER BY c.mactdh
          ) FILTER (WHERE c.mactdh IS NOT NULL),
          '[]'::json
        ) AS items
      FROM donhang d
      LEFT JOIN chitietdonhang c
        ON c.madonhang = d.madonhang
      GROUP BY d.madonhang
      ORDER BY d.ngaydat DESC
    `);

    return result.rows;
  }

  async findByCustomerId(makh: number) {
    const result = await this.pool.query(
      `
      SELECT
        d.*,
        COALESCE(
          json_agg(
            json_build_object(
              'mactdh', c.mactdh,
              'tenmon', c.tenmon,
              'image_url', c.image_url,
              'kichco', c.kichco,
              'duong', c.duong,
              'da', c.da,
              'topping', c.topping,
              'soluong', c.soluong,
              'dongia', c.dongia,
              'thanhtien', c.thanhtien
            )
            ORDER BY c.mactdh
          ) FILTER (WHERE c.mactdh IS NOT NULL),
          '[]'::json
        ) AS items
      FROM donhang d
      LEFT JOIN chitietdonhang c
        ON c.madonhang = d.madonhang
      WHERE d.makh = $1
      GROUP BY d.madonhang
      ORDER BY d.ngaydat DESC
      `,
      [makh],
    );

    return result.rows;
  }

  async findOne(orderId: string) {
    const result = await this.pool.query(
      `
      SELECT
        d.madonhanghienthi AS "orderId",
        d.trangthai AS "orderStatus",

        COALESCE(
          t.trangthai,
          'CHO_THANH_TOAN'
        ) AS "paymentStatus",

        t.phuongthuc AS "paymentMethod",
        d.ngaydat AS "createdAt",

        d.tamtinh AS subtotal,
        d.phigiaohang AS "deliveryFee",
        d.giamgia AS discount,
        d.tongtien AS "totalAmount",

        COALESCE(
          json_agg(
            json_build_object(
              'name', c.tenmon,
              'size', c.kichco,
              'options', CONCAT_WS(
                '; ',
                CASE
                  WHEN c.duong IS NOT NULL
                  THEN 'Đường: ' || c.duong
                END,
                CASE
                  WHEN c.da IS NOT NULL
                  THEN 'Đá: ' || c.da
                END,
                CASE
                  WHEN c.topping IS NOT NULL
                  THEN 'Topping: ' || c.topping
                END
              ),
              'quantity', c.soluong,
              'price', c.dongia,
              'lineTotal', c.thanhtien
            )
            ORDER BY c.mactdh
          ) FILTER (WHERE c.mactdh IS NOT NULL),
          '[]'::json
        ) AS items

      FROM donhang d
      LEFT JOIN thanhtoan t
        ON t.madonhang = d.madonhang
      LEFT JOIN chitietdonhang c
        ON c.madonhang = d.madonhang
      WHERE d.madonhanghienthi = $1
      GROUP BY d.madonhang, t.mathanhtoan
      `,
      [orderId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng.',
      );
    }

    return result.rows[0];
  }

  async updateStatus(
    madonhang: number,
    nextStatus: OrderStatus,
  ) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `
        SELECT madonhang, madonhanghienthi, trangthai
        FROM donhang
        WHERE madonhang = $1
        FOR UPDATE
        `,
        [madonhang],
      );

      if (result.rowCount === 0) {
        throw new NotFoundException(
          'Không tìm thấy đơn hàng.',
        );
      }

      const order = result.rows[0];
      const currentStatus = order.trangthai as OrderStatus;

      try {
        assertTransition(currentStatus, nextStatus);
      } catch (error: unknown) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Chuyển trạng thái không hợp lệ.',
        );
      }

      // Chỉ cập nhật trạng thái ở đây.
      // Không tự hoàn kho khi hủy vì cần lưu lại định lượng
      // nguyên liệu đã xuất tại thời điểm đặt đơn để hoàn kho
      // chính xác kể cả khi công thức đã thay đổi.
      const updated = await client.query(
        `
        UPDATE donhang
        SET trangthai = $1,
            ngaycapnhat = CURRENT_TIMESTAMP
        WHERE madonhang = $2
        RETURNING *
        `,
        [nextStatus, madonhang],
      );

      await client.query('COMMIT');

      return {
        message: 'Cập nhật trạng thái đơn hàng thành công.',
        order: updated.rows[0],
      };
    } catch (error: unknown) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: unknown) {
        console.error(
          'LỖI ROLLBACK CẬP NHẬT TRẠNG THÁI:',
          rollbackError,
        );
      }

      throw error;
    } finally {
      client.release();
    }
  }

  async getDashboardStats() {
    const result = await this.pool.query(`
      SELECT
        (
          SELECT COUNT(*)
          FROM donhang
        ) AS "totalOrders",

        (
          SELECT COUNT(*)
          FROM donhang
          WHERE trangthai IN (
            'PENDING',
            'PAID',
            'PREPARING',
            'READY'
          )
        ) AS "processingOrders",

        (
          SELECT COUNT(*)
          FROM menu_products
        ) AS "totalProducts",

        (
          SELECT COUNT(*)
          FROM menu_products
          WHERE track_inventory = TRUE
            AND stock_quantity <= low_stock_threshold
        ) AS "lowStockProducts",

        (
          SELECT COUNT(*)
          FROM menu_products
          WHERE track_inventory = TRUE
            AND stock_quantity = 0
        ) AS "outOfStockProducts",

        (
          SELECT COUNT(*)
          FROM ingredients i
          LEFT JOIN ingredient_inventory inv
            ON inv.ingredient_id = i.id
          WHERE i.is_active = TRUE
            AND COALESCE(inv.stock_quantity, 0)
                <= COALESCE(inv.low_stock_threshold, 0)
        ) AS "lowStockIngredients",

        (
          SELECT COUNT(*)
          FROM ingredients i
          LEFT JOIN ingredient_inventory inv
            ON inv.ingredient_id = i.id
          WHERE i.is_active = TRUE
            AND COALESCE(inv.stock_quantity, 0) = 0
        ) AS "outOfStockIngredients"
    `);

    const row = result.rows[0];

    return {
      totalOrders: Number(row.totalOrders),
      processingOrders: Number(row.processingOrders),
      totalProducts: Number(row.totalProducts),
      lowStockProducts: Number(row.lowStockProducts),
      outOfStockProducts: Number(row.outOfStockProducts),
      lowStockIngredients: Number(row.lowStockIngredients),
      outOfStockIngredients: Number(row.outOfStockIngredients),
    };
  }
}
