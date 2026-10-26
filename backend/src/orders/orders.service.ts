
import {
  Inject,
  Injectable,
  BadRequestException,
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

  async create(createOrderDto: CreateOrderDto) {
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
      makh,
    } = createOrderDto;

    if (
      makh == null ||
      !Number.isInteger(Number(makh)) ||
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

    // Kiểm tra tổng tiền
    const expectedTotal = subtotal + deliveryFee - discount;

    if (
      expectedTotal < 0 ||
      Math.abs(expectedTotal - totalAmount) > 0.001
    ) {
      throw new BadRequestException(
        'Tổng tiền không hợp lệ.',
      );
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
          Number(makh),
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
      for (const item of items) {
        const topping = item.topping?.length
          ? item.topping.join(', ')
          : null;

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
