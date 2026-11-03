
import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Pool } from 'pg';
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

interface PricedOrderItem {
  id: string;
  name: string;
  price?: number;
  quantity: number;
  size?: string;
  topping?: string[];
  sugar?: string;
  ice?: string;
  productId: number;
  productName: string;
  categorySlug: string;
  sizeId: number | null;
  finalUnitPrice: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    authenticatedMakh?: string | number,
  ) {
    const {
      items,
      customerName,
      customerPhone,
      address,
      phuong,
      deliveryFee = 0,
      maGiamGia,
      note,
    } = createOrderDto;

    const makh = authenticatedMakh;

    if (
      makh == null ||
      !Number.isSafeInteger(Number(makh)) ||
      Number(makh) < 1
    ) {
      throw new UnauthorizedException(
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
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Tính giá sản phẩm từ database, không tin giá frontend.
      let calculatedSubtotal = 0;

      const pricedItems: PricedOrderItem[] = [];

      for (const item of items) {
        const productId = Number(item.id);

        const productResult = await client.query(
          `
          SELECT
            p.id,
            p.name,
            p.base_price,
            p.is_available,
            c.slug AS category_slug
          FROM menu_products p
          JOIN menu_categories c ON c.id = p.category_id
          WHERE p.id = $1
          FOR UPDATE OF p
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

        let unitPrice = 0;
        let sizeId: number | null = null;

        // Bánh sử dụng base_price, không có size.
        if (product.category_slug === 'banh') {
          if (item.size) {
            throw new BadRequestException(
              `Sản phẩm "${product.name}" không hỗ trợ chọn size.`,
            );
          }

          unitPrice = Number(product.base_price);
        } else {
          // Đồ uống phải chọn size hợp lệ.
          const sizeMap: Record<string, string> = {
            'NHỎ': 'S',
            'VỪA': 'M',
            'LỚN': 'L',
            S: 'S',
            M: 'M',
            L: 'L',
          };

          const normalizedSize = sizeMap[
            item.size?.trim().toUpperCase() ?? ''
          ];

          if (!normalizedSize) {
            throw new BadRequestException(
              `Vui lòng chọn size hợp lệ cho "${product.name}".`,
            );
          }

          const sizeResult = await client.query(
            `
            SELECT id, price
            FROM menu_product_sizes
            WHERE product_id = $1
              AND UPPER(TRIM(size_code)) = $2
              AND is_available = TRUE
            `,
            [productId, normalizedSize],
          );

          if (sizeResult.rowCount === 0) {
            throw new BadRequestException(
              `Size ${normalizedSize} của "${product.name}" hiện không khả dụng.`,
            );
          }

          sizeId = Number(sizeResult.rows[0].id);
          unitPrice = Number(sizeResult.rows[0].price);
        }

        // Kiểm tra và lấy giá topping từ database.
        const originalToppings = item.topping ?? [];
        const toppingNames = [...new Set(originalToppings)];

        if (toppingNames.length !== originalToppings.length) {
          throw new BadRequestException(
            `Topping của "${product.name}" không được chọn trùng.`,
          );
        }

        let toppingPrice = 0;

        if (toppingNames.length > 0) {
          if (product.category_slug === 'banh') {
            throw new BadRequestException(
              `Sản phẩm bánh "${product.name}" không hỗ trợ topping.`,
            );
          }

          const toppingResult = await client.query(
            `
            SELECT t.name, t.price
            FROM menu_toppings t
            JOIN menu_product_toppings pt
              ON pt.topping_id = t.id
            WHERE pt.product_id = $1
              AND t.name = ANY($2::text[])
              AND t.is_available = TRUE
            `,
            [productId, toppingNames],
          );

          if (toppingResult.rowCount !== toppingNames.length) {
            throw new BadRequestException(
              `Một hoặc nhiều topping của "${product.name}" không hợp lệ hoặc không khả dụng.`,
            );
          }

          toppingPrice = toppingResult.rows.reduce(
            (sum, topping) => sum + Number(topping.price),
            0,
          );
        }

        const finalUnitPrice = unitPrice + toppingPrice;

        calculatedSubtotal +=
          finalUnitPrice * item.quantity;

        pricedItems.push({
          ...item,
          productId,
          productName: product.name,
          categorySlug: product.category_slug,
          sizeId,
          finalUnitPrice,
        });
      }

      let calculatedDiscount = 0;

      if (maGiamGia?.trim()) {
        const code = maGiamGia.trim().toUpperCase();

        const discountResult = await client.query(
          `
          SELECT *
          FROM magiamgia
          WHERE UPPER(TRIM(ma)) = $1
          FOR UPDATE
          `,
          [code],
        );

        if (discountResult.rowCount === 0) {
          throw new BadRequestException(
            'Mã giảm giá không tồn tại.',
          );
        }

        const discount = discountResult.rows[0];
        const now = new Date();

        if (discount.trang_thai !== 'DANG_SU_DUNG') {
          throw new BadRequestException(
            'Mã giảm giá hiện không khả dụng.',
          );
        }

        if (
          discount.ngay_bat_dau &&
          now < new Date(discount.ngay_bat_dau)
        ) {
          throw new BadRequestException(
            'Mã giảm giá chưa đến thời gian sử dụng.',
          );
        }

        if (
          discount.ngay_ket_thuc &&
          now > new Date(discount.ngay_ket_thuc)
        ) {
          throw new BadRequestException(
            'Mã giảm giá đã hết hạn.',
          );
        }

        if (
          discount.so_luong_toi_da !== null &&
          Number(discount.so_luong_da_dung) >=
            Number(discount.so_luong_toi_da)
        ) {
          throw new BadRequestException(
            'Mã giảm giá đã hết lượt sử dụng.',
          );
        }

        if (
          calculatedSubtotal <
          Number(discount.don_hang_toi_thieu)
        ) {
          throw new BadRequestException(
            `Đơn hàng phải đạt tối thiểu ${Number(discount.don_hang_toi_thieu).toLocaleString('vi-VN')}đ để sử dụng mã này.`,
          );
        }

        // Kiểm tra khách đã sử dụng mã này chưa.
        const usedResult = await client.query(
          `
          SELECT 1
          FROM lich_su_su_dung_ma_giam_gia
          WHERE ma_giam_gia_id = $1
            AND makh = $2
          LIMIT 1
          `,
          [discount.id, Number(makh)],
        );

        if (usedResult.rows.length > 0) {
          throw new BadRequestException(
            'Bạn đã sử dụng mã giảm giá này rồi.',
          );
        }

        // Mã khách mới: kiểm tra khách đã có đơn thành công chưa.
        if (discount.loai_ma === 'NEW_CUSTOMER') {
          const previousOrder = await client.query(
            `
            SELECT 1
            FROM donhang
            WHERE makh = $1
              AND trangthai IN (
                'PAID',
                'PREPARING',
                'READY',
                'COMPLETED'
              )
            LIMIT 1
            `,
            [Number(makh)],
          );

          if (previousOrder.rows.length > 0) {
            throw new BadRequestException(
              'Mã này chỉ dành cho khách hàng đặt đơn lần đầu.',
            );
          }
        }

        calculatedDiscount = Math.min(
          Number(discount.so_tien_giam),
          calculatedSubtotal,
        );
      }

      const calculatedTotal =
        calculatedSubtotal + Number(deliveryFee) - calculatedDiscount;

      if (calculatedTotal < 0) {
        throw new BadRequestException(
          'Tổng tiền đơn hàng không hợp lệ.',
        );
      }

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
        magiamgia,
        tongtien
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12
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
        calculatedSubtotal,
        deliveryFee,
        calculatedDiscount,
        maGiamGia?.trim().toUpperCase() || null,
        calculatedTotal,
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
      for (const item of pricedItems) {
        const productId = item.productId;

        const productResult = await client.query(
          `
          SELECT
            p.id,
            p.name,
            p.image_url,
            p.is_available,
            p.stock_quantity,
            p.track_inventory,
            c.slug AS category_slug
          FROM menu_products p
          JOIN menu_categories c ON c.id = p.category_id
          WHERE p.id = $1
          FOR UPDATE OF p
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

        // 4. Lấy công thức phù hợp với size của sản phẩm.
        const isCake = product.category_slug === 'banh';

        let recipeResult;

        if (isCake) {
          // Bánh luôn lấy công thức mặc định, không phụ thuộc item.size.
          recipeResult = await client.query(
            `
            SELECT r.id
            FROM recipes r
            WHERE r.product_id = $1
              AND r.size_id IS NULL
              AND r.is_active = TRUE
            ORDER BY r.version DESC, r.id DESC
            LIMIT 1
            `,
            [productId],
          );
        } else {
          // Món nước lấy công thức theo size.
          const rawSize = item.size?.trim().toUpperCase() || null;

          const sizeMap: Record<string, string> = {
            'NHỎ': 'S',
            'VỪA': 'M',
            'LỚN': 'L',
            S: 'S',
            M: 'M',
            L: 'L',
          };

          const size = rawSize
            ? sizeMap[rawSize] ?? rawSize
            : null;

          if (!size) {
            throw new BadRequestException(
              `Vui lòng chọn size cho sản phẩm "${product.name}".`,
            );
          }

          recipeResult = await client.query(
            `
            SELECT r.id
            FROM recipes r
            JOIN menu_product_sizes s ON s.id = r.size_id
            WHERE r.product_id = $1
              AND s.product_id = $1
              AND UPPER(TRIM(s.size_code)) = $2
              AND r.is_active = TRUE
            ORDER BY r.version DESC, r.id DESC
            LIMIT 1
            `,
            [productId, size],
          );
        }

        if (recipeResult.rowCount === 0) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" chưa có công thức phù hợp.`,
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
            item.finalUnitPrice,
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
          JOIN ingredient_inventory inv
            ON inv.ingredient_id = i.id
          WHERE i.id = $1
          FOR UPDATE OF inv
          `,
          [ingredient.ingredientId],
        );

        if (inventoryResult.rowCount === 0) {
          throw new BadRequestException(
            `Nguyên liệu "${ingredient.name}" chưa có bản ghi tồn kho.`,
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
            `Rất tiếc, nguyên liệu "${ingredient.name}" hiện không đủ để đáp ứng đơn hàng. Vui lòng giảm số lượng đặt hàng hoặc thử lại sau.`,
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

  async findByCustomerId(authenticatedMakh?: string | number) {
    const makh = Number(authenticatedMakh);
    if (!Number.isSafeInteger(makh) || makh < 1) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập để xem lịch sử đơn hàng.',
      );
    }

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
        AND (
          d.trangthai <> 'PENDING'
          OR EXISTS (
            SELECT 1
            FROM thanhtoan t
            WHERE t.madonhang = d.madonhang
          )
        )
      GROUP BY d.madonhang
      ORDER BY d.ngaydat DESC
      `,
      [makh],
    );

    return result.rows;
  }

  async findOne(orderId: string, authenticatedMakh?: string | number) {
    if (
      authenticatedMakh == null ||
      !/^\d+$/.test(String(authenticatedMakh))
    ) {
      throw new UnauthorizedException(
        'Không xác định được khách hàng đăng nhập.',
      );
    }

    if (!/^ORD-[A-Za-z0-9-]+$/.test(orderId)) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ.');
    }

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
        t.ngaythanhtoan AS "paidAt",
        d.ngaydat AS "createdAt",

        d.hotennguoinhan AS "recipientName",
        d.sodienthoainguoinhan AS "recipientPhone",
        d.diachigiaohang AS "deliveryAddress",
        d.phuong AS province,
        d.ghichu AS note,

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

      -- Chỉ lấy giao dịch thanh toán mới nhất.
      LEFT JOIN LATERAL (
        SELECT
          t.trangthai,
          t.phuongthuc,
          t.ngaythanhtoan
        FROM thanhtoan t
        WHERE t.madonhang = d.madonhang
        ORDER BY t.mathanhtoan DESC
        LIMIT 1
      ) t ON TRUE

      LEFT JOIN chitietdonhang c
        ON c.madonhang = d.madonhang

      WHERE d.madonhanghienthi = $1
        AND d.makh = $2::bigint

      GROUP BY
        d.madonhang,
        t.trangthai,
        t.phuongthuc,
        t.ngaythanhtoan
      `,
      [orderId, String(authenticatedMakh)],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
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

      // 1. Khóa đơn hàng và lấy thông tin mã giảm giá.
      const result = await client.query(
        `
        SELECT
          madonhang,
          madonhanghienthi,
          makh,
          trangthai,
          magiamgia,
          giamgia
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

      // 2. Kiểm tra chuyển trạng thái hợp lệ.
      try {
        assertTransition(currentStatus, nextStatus);
      } catch (error: unknown) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Chuyển trạng thái không hợp lệ.',
        );
      }

      // 3. Nếu Admin xác nhận đơn đã thanh toán.
      if (nextStatus === OrderStatus.PAID) {
        // Lấy giao dịch thanh toán mới nhất.
        const paymentResult = await client.query(
          `
          SELECT
            mathanhtoan,
            phuongthuc,
            trangthai
          FROM thanhtoan
          WHERE madonhang = $1
          ORDER BY mathanhtoan DESC
          LIMIT 1
          FOR UPDATE
          `,
          [madonhang],
        );

        if (paymentResult.rowCount === 0) {
          throw new BadRequestException(
            'Đơn hàng chưa có giao dịch thanh toán.',
          );
        }

        const payment = paymentResult.rows[0];

        // Chỉ cho Admin xác nhận giao dịch COD đang chờ thanh toán.
        if (
          payment.phuongthuc === 'COD' &&
          payment.trangthai === 'CHO_THANH_TOAN'
        ) {
          await client.query(
            `
            UPDATE thanhtoan
            SET trangthai = 'DA_THANH_TOAN',
                ngaythanhtoan = CURRENT_TIMESTAMP
            WHERE mathanhtoan = $1
            `,
            [payment.mathanhtoan],
          );
        } else if (payment.trangthai !== 'DA_THANH_TOAN') {
          throw new BadRequestException(
            'Giao dịch chưa thanh toán thành công.',
          );
        }

        // 4. Ghi nhận lịch sử sử dụng mã giảm giá nếu đơn có mã.
        if (
          order.magiamgia &&
          Number(order.giamgia) > 0
        ) {
          const discountResult = await client.query(
            `
            INSERT INTO lich_su_su_dung_ma_giam_gia (
              ma_giam_gia_id,
              makh,
              madonhang,
              so_tien_duoc_giam
            )
            SELECT
              m.id,
              d.makh,
              d.madonhang,
              d.giamgia
            FROM donhang d
            JOIN magiamgia m
              ON UPPER(TRIM(m.ma)) = UPPER(TRIM(d.magiamgia))
            WHERE d.madonhang = $1
              AND d.magiamgia IS NOT NULL
              AND d.giamgia > 0
            `,
            [madonhang],
          );

          if (discountResult.rowCount !== 1) {
            throw new BadRequestException(
              'Không thể ghi nhận lịch sử sử dụng mã giảm giá.',
            );
          }
        }
      }

      // 5. Cập nhật trạng thái đơn hàng.
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
