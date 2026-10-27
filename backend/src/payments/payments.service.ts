
import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.module';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async create(
    dto: CreatePaymentDto,
    idempotencyKey: string,
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
        `SELECT *
         FROM thanhtoan
         WHERE idempotency_key = $1`,
        [idempotencyKey],
      );

      if (existing.rowCount) {
        const payment = existing.rows[0];

        if (
          Number(payment.madonhang) !== dto.madonhang ||
          payment.phuongthuc !== dto.phuongthuc
        ) {
          throw new ConflictException(
            'Idempotency-Key đã được sử dụng cho yêu cầu khác.',
          );
        }

        await client.query('COMMIT');

        return {
          message: 'Yêu cầu đã được xử lý trước đó.',
          payment,
          replayed: true,
        };
      }

      // Khóa đơn hàng trong transaction.
      const orderResult = await client.query(
        `SELECT madonhang, tongtien, trangthai
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

      if (
        order.trangthai !== 'PENDING' &&
        order.trangthai !== 'PAYMENT_FAILED'
      ) {
        throw new BadRequestException(
          'Trạng thái đơn hàng không cho phép tạo yêu cầu thanh toán.',
        );
      }

      // Mỗi đơn chỉ có một bản ghi thanh toán theo schema hiện tại.
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
          idempotency_key
        )
        VALUES ($1, $2, 'CHO_THANH_TOAN', $3, $4)
        RETURNING *`,
        [
          dto.madonhang,
          dto.phuongthuc,
          order.tongtien,
          idempotencyKey,
        ],
      );

      await client.query('COMMIT');

      return {
        message: 'Tạo yêu cầu thanh toán thành công.',
        payment: result.rows[0],
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
