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
import {
  OrderStatus,
  assertTransition,
} from '../orders/order-state-machine';

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
      throw new BadRequestException('Idempotency-Key không hợp lệ.');
    }

    const makh = Number(authenticatedMakh);

    if (!Number.isSafeInteger(makh) || makh < 1) {
      throw new UnauthorizedException('Vui lòng đăng nhập để thanh toán.');
    }

    const isCod = dto.phuongthuc === PaymentMethod.COD;

    const paymentStatus = isCod
      ? 'CHO_THANH_TOAN'
      : dto.mockResult === MockPaymentResult.SUCCESS
        ? 'DA_THANH_TOAN'
        : dto.mockResult === MockPaymentResult.FAILURE
          ? 'THAT_BAI'
          : null;

    if (paymentStatus === null) {
      throw new BadRequestException(
        'Vui lòng cung cấp kết quả thanh toán mô phỏng.',
      );
    }

    const nextOrderStatus = isCod
      ? OrderStatus.PENDING
      : paymentStatus === 'DA_THANH_TOAN'
        ? OrderStatus.PAID
        : OrderStatus.PAYMENT_FAILED;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Hai request dùng cùng Idempotency-Key chỉ được xử lý một lần.
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [idempotencyKey],
      );

      // Nếu key đã được xử lý, trả lại kết quả cũ.
      const existing = await client.query(
        `SELECT p.*, d.makh, d.trangthai AS order_status
         FROM thanhtoan p
         JOIN donhang d ON d.madonhang = p.madonhang
         WHERE p.idempotency_key = $1`,
        [idempotencyKey],
      );

      if (existing.rows.length > 0) {
        const payment = existing.rows[0];

        if (
          Number(payment.madonhang) !== Number(dto.madonhang) ||
          payment.phuongthuc !== dto.phuongthuc ||
          Number(payment.makh) !== makh
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

      // Khóa đơn hàng để tránh hai giao dịch cùng xử lý một đơn.
      const orderResult = await client.query(
        `SELECT
            madonhang,
            makh,
            tongtien,
            trangthai,
            magiamgia,
            giamgia
        FROM donhang
        WHERE madonhang = $1
        FOR UPDATE`,
        [dto.madonhang],
      );

      if (orderResult.rows.length === 0) {
        throw new NotFoundException('Không tìm thấy đơn hàng.');
      }

      const order = orderResult.rows[0];

      if (Number(order.makh) !== makh) {
        throw new NotFoundException('Không tìm thấy đơn hàng.');
      }

      if (
        ![OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED].includes(
          order.trangthai,
        )
      ) {
        throw new BadRequestException(
          'Trạng thái đơn hàng không cho phép thanh toán.',
        );
      }

      // Chỉ cho thử lại nếu giao dịch gần nhất đã thất bại.
      const latestPayment = await client.query(
        `SELECT *
         FROM thanhtoan
         WHERE madonhang = $1
         ORDER BY mathanhtoan DESC
         LIMIT 1`,
        [dto.madonhang],
      );

      if (
        latestPayment.rows.length > 0 &&
        ['DA_THANH_TOAN', 'CHO_THANH_TOAN'].includes(
          latestPayment.rows[0].trangthai,
        )
      ) {
        throw new ConflictException(
          'Đơn hàng đã có giao dịch đang chờ hoặc đã thanh toán.',
        );
      }

      if (isCod && order.trangthai === OrderStatus.PAYMENT_FAILED) {
        throw new BadRequestException(
          'Đơn hàng thanh toán thất bại không thể đổi sang COD tại bước này.',
        );
      }

      const paymentResult = await client.query(
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

      // COD giữ đơn ở PENDING; giao dịch online cập nhật theo kết quả mô phỏng.
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
          SET trangthai = $1,
              ngaycapnhat = CURRENT_TIMESTAMP
          WHERE madonhang = $2`,
          [nextOrderStatus, dto.madonhang],
        );

        // Chỉ ghi nhận mã giảm giá khi thanh toán thành công.
        if (
          paymentStatus === 'DA_THANH_TOAN' &&
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
            [dto.madonhang],
          );

          // Đảm bảo lịch sử sử dụng mã được ghi nhận.
          if (discountResult.rowCount !== 1) {
            throw new BadRequestException(
              'Không thể ghi nhận lịch sử sử dụng mã giảm giá.',
            );
          }
        }
      }

      await client.query('COMMIT');

      return {
        message: isCod
          ? 'Đơn COD đã được ghi nhận; thanh toán khi nhận hàng.'
          : paymentStatus === 'DA_THANH_TOAN'
            ? 'Thanh toán mô phỏng thành công.'
            : 'Thanh toán mô phỏng thất bại.',
        payment: paymentResult.rows[0],
        orderStatus: nextOrderStatus,
        paymentStatus,
        replayed: false,
      };
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('LỖI THANH TOÁN:', error);
        console.error('LỖI ROLLBACK THANH TOÁN:', rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }
}