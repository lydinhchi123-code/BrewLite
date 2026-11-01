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

import { OrderStatus, assertTransition } from './order-state-machine';

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
      province,
      subtotal,
      deliveryFee = 0,
      discount = 0,
      totalAmount,
      note,
    } = createOrderDto;

    const makh = authenticatedMakh;

    if (makh == null || !Number.isInteger(Number(makh)) || Number(makh) < 1) {
      throw new UnauthorizedException(
        'Không xác định được khách hàng. Vui lòng đăng nhập lại.',
      );
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một món.');
    }

    // Kiểm tra tổng tiền
    const expectedTotal = subtotal + deliveryFee - discount;

    if (expectedTotal < 0 || Math.abs(expectedTotal - totalAmount) > 0.001) {
      throw new BadRequestException('Tổng tiền không hợp lệ.');
    }

    // Kiểm tra tạm tính
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    if (Math.abs(calculatedSubtotal - subtotal) > 0.001) {
      throw new BadRequestException(
        'Tạm tính không khớp với chi tiết đơn hàng.',
      );
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const displayOrderId = `ORD-${Date.now()}`;

      // Tạo đơn hàng
      const orderResult = await client.query(
        `
        INSERT INTO donhang (
          madonhanghienthi,
          makh,
          hotennguoinhan,
          sodienthoainguoinhan,
          diachigiaohang,
          tinhthanh,
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
          String(makh),
          customerName,
          customerPhone,
          address,
          province,
          note ?? null,
          subtotal,
          deliveryFee,
          discount,
          totalAmount,
        ],
      );

      const order = orderResult.rows[0];

      // Tạo chi tiết từng món
      let hasStockDeduction = false;

      for (const item of items) {
        const productId = Number(item.id);

        if (!Number.isSafeInteger(productId) || productId <= 0) {
          throw new BadRequestException(`ID sản phẩm không hợp lệ: ${item.id}`);
        }

        // Khóa sản phẩm để các đơn đặt đồng thời không thể
        // cùng sử dụng một lượng tồn kho chưa được cập nhật.
        const productResult = await client.query(
          `
          SELECT id, name, is_available,
                 stock_quantity, track_inventory
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

        let stockDeducted = false;

        if (product.track_inventory) {
          const stock = Number(product.stock_quantity);

          if (stock < item.quantity) {
            throw new BadRequestException(
              `Sản phẩm "${product.name}" không đủ hàng. Tồn kho: ${stock}, số lượng yêu cầu: ${item.quantity}.`,
            );
          }

          // Điều kiện stock_quantity >= quantity là lớp bảo vệ bổ sung.
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
          hasStockDeduction = true;
        }

        const topping = item.topping?.length ? item.topping.join(', ') : null;

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
            item.image_url,
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

      // Đánh dấu đã xử lý tồn kho trong transaction.
      await client.query(
        `
        UPDATE donhang
        SET inventory_reserved = $1
        WHERE madonhang = $2
        `,
        [hasStockDeduction, order.madonhang],
      );

      await client.query('COMMIT');

      return {
        message: 'Tạo đơn hàng thành công!',
        orderId: order.madonhanghienthi,
        order,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Lấy danh sách đơn hàng kèm chi tiết
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
      GROUP BY d.madonhang
      ORDER BY d.ngaydat DESC
      `,
      [makh],
    );

    return result.rows;
  }

  async findOne(orderId: string, authenticatedMakh?: string | number) {
    if (authenticatedMakh == null || !/^\d+$/.test(String(authenticatedMakh))) {
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
      d.tinhthanh AS province,
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

    LEFT JOIN thanhtoan t
      ON t.madonhang = d.madonhang

    LEFT JOIN chitietdonhang c
      ON c.madonhang = d.madonhang

      WHERE d.madonhanghienthi = $1
        AND d.makh = $2::bigint

    GROUP BY
      d.madonhang,
      t.mathanhtoan
    `,
      [orderId, String(authenticatedMakh)],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return result.rows[0];
  }

  async updateStatus(madonhang: number, nextStatus: OrderStatus) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Khóa dòng đơn hàng để tránh hai yêu cầu
      // đồng thời đọc cùng một trạng thái cũ.
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
        throw new NotFoundException('Không tìm thấy đơn hàng.');
      }

      const order = result.rows[0];
      const currentStatus = order.trangthai as OrderStatus;

      try {
        assertTransition(currentStatus, nextStatus);
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error
            ? error.message
            : 'Chuyển trạng thái không hợp lệ.',
        );
      }

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
    } catch (error) {
      await client.query('ROLLBACK');
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
        ) AS "outOfStockProducts"
    `);

    const row = result.rows[0];

    return {
      totalOrders: Number(row.totalOrders),
      processingOrders: Number(row.processingOrders),
      totalProducts: Number(row.totalProducts),
      lowStockProducts: Number(row.lowStockProducts),
      outOfStockProducts: Number(row.outOfStockProducts),
    };
  }
}
