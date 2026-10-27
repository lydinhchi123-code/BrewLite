import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async create(createOrderDto: CreateOrderDto, customerId: string) {
    if (!/^[1-9]\d*$/.test(customerId)) {
      throw new UnauthorizedException('Thiếu mã khách hàng đăng nhập.');
    }

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

    if (!items || items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một món.');
    }

    const expectedTotal = subtotal + deliveryFee - discount;

    if (expectedTotal < 0 || Math.abs(expectedTotal - totalAmount) > 0.001) {
      throw new BadRequestException('Tổng tiền không hợp lệ.');
    }

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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        `,
        [
          displayOrderId,
          customerId,
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

      const legacySchemaResult = await client.query<{ hasLegacyColumns: boolean }>(`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'chitietdonhang'
            AND column_name = 'stt'
        ) AS "hasLegacyColumns"
      `);
      const usesLegacySchema = legacySchemaResult.rows[0].hasLegacyColumns;

      for (const [index, item] of items.entries()) {
        const topping = item.topping?.length ? item.topping.join(', ') : null;
        const options = [
          item.size ? `Size: ${item.size}` : null,
          item.sugar ? `Đường: ${item.sugar}` : null,
          item.ice ? `Đá: ${item.ice}` : null,
          topping ? `Topping: ${topping}` : null,
        ]
          .filter(Boolean)
          .join('; ');

        if (usesLegacySchema) {
          await client.query(
            `
            INSERT INTO chitietdonhang (
              madonhang,
              stt,
              tenmon,
              tuychon,
              soluong,
              dongia,
              thanhtien,
              image_url,
              kichco,
              duong,
              da,
              topping
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `,
            [
              order.madonhang,
              index + 1,
              item.name,
              options || null,
              item.quantity,
              item.price,
              item.price * item.quantity,
              null,
              item.size ?? null,
              item.sugar ?? null,
              item.ice ?? null,
              topping,
            ],
          );
          continue;
        }

        await client.query(
          `
          INSERT INTO chitietdonhang (
            madonhang,
            tenmon,
            image_url,
            kichco,
            duong,
            da,
            topping,
            soluong,
            dongia
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `,
          [
            order.madonhang,
            item.name,
            null,
            item.size ?? null,
            item.sugar ?? null,
            item.ice ?? null,
            topping,
            item.quantity,
            item.price,
          ],
        );
      }

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

  async update(
    orderId: string,
    updateOrderDto: CreateOrderDto,
    customerId: string,
  ) {
    if (!/^[A-Za-z0-9_-]{1,30}$/.test(orderId)) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ.');
    }
    if (!/^[1-9]\d*$/.test(customerId)) {
      throw new UnauthorizedException('Thiếu mã khách hàng đăng nhập.');
    }

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
    } = updateOrderDto;
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    if (
      items.length === 0 ||
      Math.abs(calculatedSubtotal - subtotal) > 0.001 ||
      Math.abs(subtotal + deliveryFee - discount - totalAmount) > 0.001 ||
      totalAmount < 0
    ) {
      throw new BadRequestException('Thông tin hoặc tổng tiền đơn hàng không hợp lệ.');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const currentResult = await client.query(
        `
        SELECT d.madonhang, d.trangthai,
          COALESCE(t.trangthai, 'CHO_THANH_TOAN') AS payment_status
        FROM donhang d
        LEFT JOIN thanhtoan t ON t.madonhang = d.madonhang
        WHERE d.madonhanghienthi = $1 AND d.makh = $2::bigint
        FOR UPDATE OF d
        `,
        [orderId, customerId],
      );
      const currentOrder = currentResult.rows[0];
      if (!currentOrder) {
        throw new NotFoundException('Không tìm thấy đơn hàng.');
      }
      if (
        currentOrder.trangthai !== 'DA_TIEP_NHAN' ||
        currentOrder.payment_status === 'DA_THANH_TOAN'
      ) {
        throw new ConflictException('Đơn hàng này không còn được phép chỉnh sửa.');
      }

      await client.query(
        `
        UPDATE donhang
        SET hotennguoinhan = $1,
            sodienthoainguoinhan = $2,
            diachigiaohang = $3,
            tinhthanh = $4,
            ghichu = $5,
            tamtinh = $6,
            phigiaohang = $7,
            giamgia = $8,
            tongtien = $9,
            ngaycapnhat = CURRENT_TIMESTAMP
        WHERE madonhang = $10
        `,
        [
          customerName,
          customerPhone,
          address,
          province,
          note ?? null,
          subtotal,
          deliveryFee,
          discount,
          totalAmount,
          currentOrder.madonhang,
        ],
      );
      await client.query(
        'DELETE FROM chitietdonhang WHERE madonhang = $1',
        [currentOrder.madonhang],
      );

      const legacySchemaResult = await client.query<{ hasLegacyColumns: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'chitietdonhang' AND column_name = 'stt'
        ) AS "hasLegacyColumns"
      `);
      const usesLegacySchema = legacySchemaResult.rows[0].hasLegacyColumns;
      for (const [index, item] of items.entries()) {
        const topping = item.topping?.length ? item.topping.join(', ') : null;
        const options = [
          item.size ? `Size: ${item.size}` : null,
          item.sugar ? `Đường: ${item.sugar}` : null,
          item.ice ? `Đá: ${item.ice}` : null,
          topping ? `Topping: ${topping}` : null,
        ].filter(Boolean).join('; ');

        if (usesLegacySchema) {
          await client.query(
            `
            INSERT INTO chitietdonhang (
              madonhang, stt, tenmon, tuychon, soluong, dongia, thanhtien,
              image_url, kichco, duong, da, topping
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `,
            [currentOrder.madonhang, index + 1, item.name, options || null,
              item.quantity, item.price, item.price * item.quantity, null,
              item.size ?? null, item.sugar ?? null, item.ice ?? null, topping],
          );
        } else {
          await client.query(
            `
            INSERT INTO chitietdonhang (
              madonhang, tenmon, image_url, kichco, duong, da, topping,
              soluong, dongia
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `,
            [currentOrder.madonhang, item.name, null, item.size ?? null,
              item.sugar ?? null, item.ice ?? null, topping,
              item.quantity, item.price],
          );
        }
      }

      await client.query('COMMIT');
      return { message: 'Cập nhật đơn hàng thành công.', orderId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findOne(orderId: string, customerId: string) {
    if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,30}$/.test(orderId)) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ.');
    }

    if (!/^[1-9]\d*$/.test(customerId)) {
      throw new UnauthorizedException('Thiếu mã khách hàng đăng nhập.');
    }

    const result = await this.pool.query(
      `
      SELECT
        d.madonhanghienthi AS "orderId",
        d.trangthai AS "orderStatus",
        d.hotennguoinhan AS "recipientName",
        d.sodienthoainguoinhan AS "recipientPhone",
        d.diachigiaohang AS "deliveryAddress",
        d.tinhthanh AS "province",
        d.ghichu AS "note",
        d.tamtinh AS "subtotal",
        d.phigiaohang AS "deliveryFee",
        d.giamgia AS "discount",
        d.tongtien AS "totalAmount",
        d.ngaydat AS "createdAt",
        COALESCE(t.trangthai, 'CHO_THANH_TOAN') AS "paymentStatus",
        t.phuongthuc AS "paymentMethod",
        t.ngaythanhtoan AS "paidAt",
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'name', c.tenmon,
                'options', concat_ws(
                  '; ',
                  CASE WHEN c.kichco IS NOT NULL
                    THEN 'Size: ' || c.kichco END,
                  CASE WHEN c.duong IS NOT NULL
                    THEN 'Sugar: ' || c.duong END,
                  CASE WHEN c.da IS NOT NULL
                    THEN 'Ice: ' || c.da END,
                  CASE WHEN c.topping IS NOT NULL
                    THEN 'Topping: ' || c.topping END
                ),
                'quantity', c.soluong,
                'price', c.dongia,
                'lineTotal', c.thanhtien
              )
              ORDER BY c.mactdh
            )
            FROM chitietdonhang c
            WHERE c.madonhang = d.madonhang
          ),
          '[]'::json
        ) AS items
      FROM donhang d
      LEFT JOIN thanhtoan t
        ON t.madonhang = d.madonhang
      WHERE d.madonhanghienthi = $1
        AND d.makh = $2::bigint
      LIMIT 1
      `,
      [orderId, customerId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    const order = result.rows[0];

    return {
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      recipient: {
        name: order.recipientName,
        phone: order.recipientPhone,
        address: order.deliveryAddress,
        province: order.province,
      },
      note: order.note,
      items: (order.items ?? []).map(
        (item: {
          name: string;
          options: string | null;
          quantity: number | string;
          price: number | string;
          lineTotal: number | string;
        }) => ({
          name: item.name,
          size:
            /(?:^|;\s*)Size:\s*([^;]+)/.exec(item.options ?? '')?.[1]?.trim() ??
            null,
          options: item.options,
          quantity: Number(item.quantity),
          price: Number(item.price),
          lineTotal: Number(item.lineTotal),
        }),
      ),
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      discount: Number(order.discount),
      totalAmount: Number(order.totalAmount),
    };
  }

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
}
