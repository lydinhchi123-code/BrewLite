import { Inject, Injectable, BadRequestException } from '@nestjs/common';
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
    } = createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất một món.');
    }

    // Kiểm tra tổng tiền trước khi ghi database
    const expectedTotal = subtotal + deliveryFee - discount;

    if (expectedTotal < 0 || Math.abs(expectedTotal - totalAmount) > 0.001) {
      throw new BadRequestException('Tổng tiền không hợp lệ.');
    }

    // Kiểm tra giá trị tạm tính khớp với các món
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
        `INSERT INTO donhang (
          madonhanghienthi,
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          displayOrderId,
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

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const options = [
          item.size ? `Size: ${item.size}` : null,
          item.sugar ? `Đường: ${item.sugar}` : null,
          item.ice ? `Đá: ${item.ice}` : null,
          item.topping?.length ? `Topping: ${item.topping.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join('; ');

        await client.query(
          `INSERT INTO chitietdonhang (
            madonhang,
            stt,
            tenmon,
            tuychon,
            soluong,
            dongia,
            thanhtien
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.madonhang,
            i + 1,
            item.name,
            options || null,
            item.quantity,
            item.price,
            item.price * item.quantity,
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

  async findAll() {
    const result = await this.pool.query(`
    SELECT
      d.*,
      COALESCE(
        json_agg(
          json_build_object(
            'stt', c.stt,
            'tenmon', c.tenmon,
            'tuychon', c.tuychon,
            'soluong', c.soluong,
            'dongia', c.dongia,
            'thanhtien', c.thanhtien
          )
          ORDER BY c.stt
        ) FILTER (WHERE c.madonhang IS NOT NULL),
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
}
