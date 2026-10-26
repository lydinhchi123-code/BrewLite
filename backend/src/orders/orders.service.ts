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
        RETURNING *`,
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

  /**
   * Read a single order for the signed-in customer. The WHERE clause checks
   * both the display order ID and JWT customer ID, so another customer cannot
   * read or enumerate someone else's order. Return the same 404 for a missing
   * order and a foreign order to avoid disclosing its existence.
   *
   * Requires the DonHang/ChiTietDonHang/ThanhToan schema in ThanhToan.sql.
   * This method only READS payment status; it never modifies payment records.
   */
  async findOne(orderId: string, customerId: string) {
    if (
      typeof orderId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,30}$/.test(orderId)
    ) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ.');
    }

    if (!/^[1-9]\d*$/.test(customerId)) {
      throw new UnauthorizedException('Thiếu mã khách hàng đăng nhập.');
    }

    const result = await this.pool.query(
      `SELECT
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
                'options', c.tuychon,
                'quantity', c.soluong,
                'price', c.dongia,
                'lineTotal', c.thanhtien
              ) ORDER BY c.stt
            )
            FROM chitietdonhang c
            WHERE c.madonhang = d.madonhang
          ),
          '[]'::json
        ) AS items
      FROM donhang d
      LEFT JOIN thanhtoan t ON t.madonhang = d.madonhang
      WHERE d.madonhanghienthi = $1
        AND d.makh = $2::bigint
      LIMIT 1`,
      [orderId, customerId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    const order = result.rows[0] as {
      orderId: string;
      orderStatus: string;
      paymentStatus: string;
      paymentMethod: string | null;
      recipientName: string;
      recipientPhone: string;
      deliveryAddress: string;
      province: string;
      note: string | null;
      subtotal: string | number;
      deliveryFee: string | number;
      discount: string | number;
      totalAmount: string | number;
      createdAt: string | Date;
      paidAt: string | Date | null;
      items: Array<{
        name: string;
        options: string | null;
        quantity: number;
        price: number | string;
        lineTotal: number | string;
      }>;
    };

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
      items: order.items.map((item) => ({
        name: item.name,
        size:
          /(?:^|;\s*)Size:\s*([^;]+)/.exec(item.options ?? '')?.[1]?.trim() ??
          null,
        options: item.options,
        quantity: Number(item.quantity),
        price: Number(item.price),
        lineTotal: Number(item.lineTotal),
      })),
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
