
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
      maGiamGia,
      maFreeship,
      note,
      deliveryMethod,
    } = createOrderDto;

    const isPickup = deliveryMethod === 'PICKUP';
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
            WHERE t.name = ANY($1::text[])
              AND t.is_available = TRUE
            `,
            [toppingNames],
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
    let calculatedFreeShipDiscount = 0;

    // Phí vận chuyển gốc do backend tự tính.
    // Cần thống nhất các mức phí này với quy tắc frontend.
    const calculatedDeliveryFee = isPickup ? 0
      : calculatedSubtotal < 100000 ? 20000
        : calculatedSubtotal < 200000 ? 10000
          : 0;

    // Hàm kiểm tra và tính số tiền giảm của từng voucher.
    const applyDiscount = async (
      code: string | undefined,
      expectedType: 'TIEN_HANG' | 'FREESHIP',
    ): Promise<number> => {
      if (!code?.trim()) {
        return 0;
      }

      const normalizedCode = code.trim().toUpperCase();

      const discountResult = await client.query(
        `
        SELECT *
        FROM magiamgia
        WHERE UPPER(TRIM(ma)) = $1
        FOR UPDATE
        `,
        [normalizedCode],
      );

      if (discountResult.rowCount === 0) {
        throw new BadRequestException(
          `Mã giảm giá ${normalizedCode} không tồn tại.`,
        );
      }

      const discount = discountResult.rows[0];

      if (discount.trang_thai !== 'DANG_SU_DUNG') {
        throw new BadRequestException(
          `Mã ${normalizedCode} hiện không khả dụng.`,
        );
      }

      const now = new Date();

      if (
        discount.ngay_bat_dau &&
        now < new Date(discount.ngay_bat_dau)
      ) {
        throw new BadRequestException(
          `Mã ${normalizedCode} chưa đến thời gian sử dụng.`,
        );
      }

      if (
        discount.ngay_ket_thuc &&
        now > new Date(discount.ngay_ket_thuc)
      ) {
        throw new BadRequestException(
          `Mã ${normalizedCode} đã hết hạn.`,
        );
      }

      if (
        discount.so_luong_toi_da !== null &&
        Number(discount.so_luong_da_dung) >=
          Number(discount.so_luong_toi_da)
      ) {
        throw new BadRequestException(
          `Mã ${normalizedCode} đã hết lượt sử dụng.`,
        );
      }

      if (
        discount.hinh_thuc_giam !== expectedType
      ) {
        throw new BadRequestException(
          `Mã ${normalizedCode} không đúng loại voucher.`,
        );
      }

      if (
        calculatedSubtotal <
        Number(discount.don_hang_toi_thieu)
      ) {
        throw new BadRequestException(
          `Đơn hàng phải đạt tối thiểu ${
            Number(discount.don_hang_toi_thieu)
              .toLocaleString('vi-VN')
          }đ để sử dụng mã ${normalizedCode}.`,
        );
      }

      const maxDiscount = Number(discount.so_tien_giam);

      if (!Number.isFinite(maxDiscount) || maxDiscount <= 0) {
        throw new BadRequestException(
          `Giá trị giảm của mã ${normalizedCode} không hợp lệ.`,
        );
      }

      // Chỉ kiểm tra lịch sử nếu voucher giới hạn mỗi khách một lần.
      if (discount.moi_khach_mot_lan) {
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
            `Bạn đã sử dụng mã ${normalizedCode} rồi.`,
          );
        }
      }

      // Kiểm tra khách hàng mới.
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
            `Mã ${normalizedCode} chỉ dành cho khách hàng mới.`,
          );
        }
      }

      // Tính tiền giảm theo loại voucher.
      const baseAmount =
        expectedType === 'TIEN_HANG'
          ? calculatedSubtotal
          : calculatedDeliveryFee;

      if (baseAmount <= 0) {
        throw new BadRequestException(
          expectedType === 'FREESHIP'
            ? 'Đơn hàng đã được miễn phí vận chuyển, không cần sử dụng mã Freeship.'
            : 'Đơn hàng không đủ điều kiện áp dụng mã giảm giá.',
        );
      }

      const amount = Math.min(maxDiscount, baseAmount);

      return amount;
    };

    // Voucher giảm tiền hàng.
    calculatedDiscount = await applyDiscount(
      maGiamGia,
      'TIEN_HANG',
    );

    // Voucher Freeship chỉ áp dụng cho đơn giao hàng.
    calculatedFreeShipDiscount = isPickup
      ? 0
      : await applyDiscount(maFreeship, 'FREESHIP');

    // Tính tổng tiền cuối cùng.
    const calculatedTotal =
      calculatedSubtotal +
      calculatedDeliveryFee -
      calculatedDiscount -
      calculatedFreeShipDiscount;

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
          hinhthucnhanhang,
          tamtinh,
          phigiaohang,
          giamgia,
          magiamgia,
          ma_freeship,
          giamgia_freeship,
          tongtien
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 
          $9, $10, $11, $12, $13, $14, $15
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
          deliveryMethod ?? 'DELIVERY',
          calculatedSubtotal,
          calculatedDeliveryFee,
          calculatedDiscount,
          maGiamGia?.trim().toUpperCase() || null,
          isPickup ? null : maFreeship?.trim().toUpperCase() || null,
          calculatedFreeShipDiscount,
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
        d.hinhthucnhanhang AS "deliveryMethod",
        d.diachigiaohang AS "deliveryAddress",
        d.phuong AS province,
        d.ghichu AS note,

        d.tamtinh AS subtotal,
        (
          d.phigiaohang - d.giamgia_freeship
        ) AS "deliveryFee",
        d.phigiaohang AS "originalDeliveryFee",
        d.giamgia AS discount,
        d.giamgia_freeship AS "freeShipDiscount",
        d.magiamgia AS "discountCode",
        d.ma_freeship AS "freeShipCode",
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

    const order = result.rows[0];

    return {
      ...order,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      originalDeliveryFee: Number(order.originalDeliveryFee),
      discount: Number(order.discount),
      freeShipDiscount: Number(order.freeShipDiscount),
      totalAmount: Number(order.totalAmount),
    };
  }

  private async releaseInventoryAndRefund(
    client: import('pg').PoolClient,
    order: {
      madonhang: number;
      madonhanghienthi: string;
      inventory_reserved: boolean;
      inventory_released: boolean;
    },
  ): Promise<void> {
    // Không có tồn kho nào được trừ thì không cần hoàn.
    if (order.inventory_reserved && !order.inventory_released) {
      // 1. Hoàn tồn kho thành phẩm.
      // Chỉ hoàn các chi tiết thực sự đã bị trừ kho.
      const productStockResult = await client.query(
        `
        SELECT
          product_id,
          SUM(soluong)::INTEGER AS quantity
        FROM chitietdonhang
        WHERE madonhang = $1
          AND stock_deducted = TRUE
          AND product_id IS NOT NULL
        GROUP BY product_id
        ORDER BY product_id
        `,
        [order.madonhang],
      );

      for (const item of productStockResult.rows) {
        await client.query(
          `
          UPDATE menu_products
          SET stock_quantity = stock_quantity + $1
          WHERE id = $2
          `,
          [
            Number(item.quantity),
            Number(item.product_id),
          ],
        );
      }

      // 2. Lấy tổng nguyên liệu đã xuất cho đơn hàng.
      // Không tính lại recipe vì công thức có thể đã thay đổi.
      const ingredientResult = await client.query(
        `
        SELECT
          ingredient_id,
          unit,
          SUM(quantity)::NUMERIC AS quantity
        FROM ingredient_transactions
        WHERE transaction_type = 'OUT'
          AND reference_type = 'ORDER'
          AND reference_id = $1
        GROUP BY ingredient_id, unit
        ORDER BY ingredient_id
        `,
        [order.madonhang],
      );

      // 3. Hoàn nguyên liệu và ghi lịch sử IN.
      for (const ingredient of ingredientResult.rows) {
        const ingredientId = Number(ingredient.ingredient_id);
        const quantity = Number(ingredient.quantity);

        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw new BadRequestException(
            `Số lượng nguyên liệu hoàn kho không hợp lệ.`,
          );
        }

        // Khóa dòng tồn kho trước khi cập nhật.
        const inventoryResult = await client.query(
          `
          SELECT
            inv.ingredient_id,
            i.base_unit
          FROM ingredient_inventory inv
          JOIN ingredients i
            ON i.id = inv.ingredient_id
          WHERE inv.ingredient_id = $1
          FOR UPDATE OF inv
          `,
          [ingredientId],
        );

        if (inventoryResult.rowCount === 0) {
          throw new BadRequestException(
            `Không tìm thấy tồn kho nguyên liệu ID ${ingredientId}. Không thể hoàn đơn.`,
          );
        }

        if (inventoryResult.rows[0].base_unit !== ingredient.unit) {
          throw new BadRequestException(
            `Đơn vị nguyên liệu ID ${ingredientId} không khớp đơn vị tồn kho. Không thể hoàn đơn.`,
          );
        }

        if (inventoryResult.rowCount === 0) {
          throw new BadRequestException(
            `Không tìm thấy tồn kho nguyên liệu ID ${ingredientId}. Không thể hoàn đơn.`,
          );
        }

        await client.query(
          `
          UPDATE ingredient_inventory
          SET stock_quantity = stock_quantity + $1,
              updated_at = NOW()
          WHERE ingredient_id = $2
          `,
          [quantity, ingredientId],
        );

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
          VALUES ($1, 'IN', $2, $3, 'ORDER_CANCEL', $4, $5)
          `,
          [
            ingredientId,
            quantity,
            ingredient.unit,
            order.madonhang,
            `Hoàn nguyên liệu do hủy đơn ${order.madonhanghienthi}.`,
          ],
        );
      }
    }

    // 4. Hoàn giao dịch thanh toán mô phỏng.
    // Chỉ chuyển giao dịch đã thanh toán thành đã hoàn.
    const paymentResult = await client.query(
      `
      SELECT mathanhtoan, trangthai
      FROM thanhtoan
      WHERE madonhang = $1
      ORDER BY mathanhtoan DESC
      LIMIT 1
      FOR UPDATE
      `,
      [order.madonhang],
    );

    if (
      paymentResult.rows.length > 0 &&
      paymentResult.rows[0].trangthai === 'DA_THANH_TOAN'
    ) {
      await client.query(
        `
        UPDATE thanhtoan
        SET trangthai = 'DA_HOAN',
            ngaycapnhat = CURRENT_TIMESTAMP
        WHERE mathanhtoan = $1
        `,
        [paymentResult.rows[0].mathanhtoan],
      );
    }
  }

  async cancelOrder(
    orderId: string,
    authenticatedMakh?: string | number,
  ) {
    const makh = Number(authenticatedMakh);

    if (!Number.isSafeInteger(makh) || makh < 1) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập để hủy đơn hàng.',
      );
    }

    if (!/^ORD-[A-Za-z0-9-]+$/.test(orderId)) {
      throw new BadRequestException(
        'Mã đơn hàng không hợp lệ.',
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Chỉ cho phép khách hàng hủy đơn thuộc tài khoản của mình.
      const result = await client.query(
        `
        SELECT
          madonhang,
          madonhanghienthi,
          makh,
          trangthai,
          inventory_reserved,
          inventory_released
        FROM donhang
        WHERE madonhanghienthi = $1
          AND makh = $2
        FOR UPDATE
        `,
        [orderId, makh],
      );

      if (result.rowCount === 0) {
        throw new NotFoundException(
          'Không tìm thấy đơn hàng.',
        );
      }

      const order = result.rows[0];
      const currentStatus = order.trangthai as OrderStatus;

      // Kiểm tra chuyển trạng thái.
      try {
        assertTransition(
          currentStatus,
          OrderStatus.CANCELLED,
        );
      } catch (error: unknown) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Không thể hủy đơn hàng này.',
        );
      }

      // Hoàn kho và hoàn thanh toán trong cùng transaction.
      await this.releaseInventoryAndRefund(client, order);

      // Cập nhật trạng thái đơn và đánh dấu đã hoàn kho.
      const updated = await client.query(
        `
        UPDATE donhang
        SET trangthai = 'CANCELLED',
            inventory_released = CASE
              WHEN inventory_reserved = TRUE THEN TRUE
              ELSE inventory_released
            END,
            ngaycapnhat = CURRENT_TIMESTAMP
        WHERE madonhang = $1
        RETURNING *
        `,
        [order.madonhang],
      );

      await client.query('COMMIT');

      return {
        message: 'Hủy đơn hàng thành công.',
        order: updated.rows[0],
      };
    } catch (error: unknown) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError: unknown) {
        console.error(
          'LỖI ROLLBACK HỦY ĐƠN:',
          rollbackError,
        );
      }

      throw error;
    } finally {
      client.release();
    }
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
          giamgia,
          ma_freeship,
          giamgia_freeship,
          inventory_reserved,
          inventory_released
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

      // Nếu Admin hủy đơn thì phải hoàn kho và hoàn thanh toán.
      if (nextStatus === OrderStatus.CANCELLED) {
        await this.releaseInventoryAndRefund(client, order);
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
        // 4. Ghi nhận lịch sử sử dụng các voucher của đơn hàng.
        const orderDiscounts = [
          {
            code: order.magiamgia,
            amount: Number(order.giamgia),
          },
          {
            code: order.ma_freeship,
            amount: Number(order.giamgia_freeship),
          },
        ];

        for (const item of orderDiscounts) {
          if (!item.code || item.amount <= 0) {
            continue;
          }

          const discountResult = await client.query(
            `
            SELECT id
            FROM magiamgia
            WHERE UPPER(TRIM(ma)) = UPPER(TRIM($1))
            FOR UPDATE
            `,
            [item.code],
          );

          if (discountResult.rowCount !== 1) {
            throw new BadRequestException(
              `Không tìm thấy voucher ${item.code} để ghi nhận lịch sử.`,
            );
          }

          const discountId = discountResult.rows[0].id;

          const historyResult = await client.query(
            `
            INSERT INTO lich_su_su_dung_ma_giam_gia (
              ma_giam_gia_id,
              makh,
              madonhang,
              so_tien_duoc_giam
            )
            VALUES ($1, $2, $3, $4)
            RETURNING id
            `,
            [
              discountId,
              order.makh,
              order.madonhang,
              item.amount,
            ],
          );

          if (historyResult.rowCount !== 1) {
            throw new BadRequestException(
              `Không thể ghi nhận lịch sử voucher ${item.code}.`,
            );
          }
        }
      }

      // 5. Cập nhật trạng thái đơn hàng.
      const updated = await client.query(
        `
        UPDATE donhang
        SET trangthai = $1::VARCHAR,
            inventory_released = CASE
              WHEN $1::VARCHAR = 'CANCELLED'::VARCHAR
                AND inventory_reserved = TRUE
                THEN TRUE
              ELSE inventory_released
            END,
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
