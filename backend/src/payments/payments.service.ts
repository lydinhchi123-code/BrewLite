
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
import {
  CreatePaymentDto,
  MockPaymentResult,
  PaymentMethod,
} from './dto/create-payment.dto';
import { OrderStatus, assertTransition } from '../orders/order-state-machine';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async create(
    dto: CreatePaymentDto,
    idempotencyKey: string,
    authenticatedMakh?: string | number,
  ) {
    if (
      !idempotencyKey ||
      idempotencyKey.length > 100 ||
      idempotencyKey.trim() !== idempotencyKey
    ) {
      throw new BadRequestException(
        'Idempotency-Key không hợp lệ.',
      );
    }

    const makh = Number(authenticatedMakh);
    if (!Number.isSafeInteger(makh) || makh < 1) {
      throw new UnauthorizedException('Vui lòng đăng nhập để thanh toán.');
    }

    const isCod = dto.phuongthuc === PaymentMethod.COD;
    const paymentStatus = isCod
      ? 'CHO_THANH_TOAN'
      : dto.mockResult === MockPaymentResult.FAILURE
        ? 'THAT_BAI'
        : 'DA_THANH_TOAN';
    const nextOrderStatus = isCod
      ? OrderStatus.PENDING
      : paymentStatus === 'DA_THANH_TOAN'
        ? OrderStatus.PAID
        : OrderStatus.PAYMENT_FAILED;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Tuần tự hóa các request sử dụng cùng một khóa.
      await client.query(
        `SELECT pg_advisory_xact_lock(
          hashtextextended($1, 0)
        )`,
        [idempotencyKey],
      );

      // Request đã xử lý trước đó: trả lại kết quả cũ.
      const existing = await client.query(
        `SELECT p.*, d.makh, d.trangthai AS order_status
         FROM thanhtoan p
         JOIN donhang d ON d.madonhang = p.madonhang
         WHERE p.idempotency_key = $1`,
        [idempotencyKey],
      );

      if (existing.rowCount) {
        const payment = existing.rows[0];

        if (
          Number(payment.madonhang) !== dto.madonhang ||
          payment.phuongthuc !== dto.phuongthuc ||
          Number(payment.makh) !== makh ||
          payment.trangthai !== paymentStatus
        ) {
          throw new ConflictException(
            'Idempotency-Key đã được sử dụng cho yêu cầu khác.',
          );
        }

        await client.query('COMMIT');

        return {
          message: 'Yêu cầu đã được xử lý trước đó.',
          payment,
          orderStatus: payment.order_status,
          paymentStatus: payment.trangthai,
          replayed: true,
        };
      }

      // Khóa đơn hàng trong transaction.
      const orderResult = await client.query(
        `SELECT madonhang, makh, tongtien, trangthai
         FROM donhang
         WHERE madonhang = $1
         FOR UPDATE`,
        [dto.madonhang],
      );

      if (!orderResult.rowCount) {
        throw new NotFoundException(
          'Không tìm thấy đơn hàng.',
        );
      }

      const order = orderResult.rows[0];

      if (Number(order.makh) !== makh) {
        throw new NotFoundException('Không tìm thấy đơn hàng.');
      }

      if (order.trangthai !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'Trạng thái đơn hàng không cho phép tạo yêu cầu thanh toán.',
        );
      }

      // Mỗi đơn có một bản ghi kết quả thanh toán; Idempotency-Key chống ghi trùng.
      const existingOrderPayment = await client.query(
        `SELECT *
         FROM thanhtoan
         WHERE madonhang = $1`,
        [dto.madonhang],
      );

      if (existingOrderPayment.rowCount) {
        throw new ConflictException(
          'Đơn hàng đã có bản ghi thanh toán.',
        );
      }

      const result = await client.query(
        `INSERT INTO thanhtoan (
          madonhang,
          phuongthuc,
          trangthai,
          sotien,
          idempotency_key,
          ngaythanhtoan
        )
        VALUES (
          $1, $2, $3, $4, $5,
          CASE WHEN $6::boolean THEN CURRENT_TIMESTAMP ELSE NULL END
        )
        RETURNING *`,
        [
          dto.madonhang,
          dto.phuongthuc,
          paymentStatus,
          order.tongtien,
          idempotencyKey,
          paymentStatus === 'DA_THANH_TOAN',
        ],
      );

      if (!isCod) {
        try {
          assertTransition(
            order.trangthai as OrderStatus,
            nextOrderStatus,
          );
        } catch (error) {
          throw new BadRequestException(
            error instanceof Error
              ? error.message
              : 'Chuyển trạng thái đơn hàng không hợp lệ.',
          );
        }

        await client.query(
          `UPDATE donhang
           SET trangthai = $1, ngaycapnhat = CURRENT_TIMESTAMP
           WHERE madonhang = $2`,
          [nextOrderStatus, dto.madonhang],
        );
      }

      await client.query('COMMIT');

      return {
        message: isCod
          ? 'Đơn COD đã được ghi nhận; thanh toán khi nhận hàng.'
          : paymentStatus === 'DA_THANH_TOAN'
            ? 'Thanh toán mô phỏng thành công.'
            : 'Thanh toán mô phỏng thất bại.',
        payment: result.rows[0],
        orderStatus: nextOrderStatus,
        paymentStatus,
        replayed: false,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
