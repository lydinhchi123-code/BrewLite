import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { Pool } from 'pg';
import { OrderStatus } from '../orders/order-state-machine';
import {
  CreatePaymentDto,
  MockPaymentResult,
  PaymentMethod,
} from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let pool: { connect: jest.Mock };
  let client: { query: jest.Mock; release: jest.Mock };

  const pendingOrder = {
    madonhang: 42,
    makh: 7,
    tongtien: '50000',
    trangthai: OrderStatus.PENDING,
    magiamgia: null,
    giamgia: '0',
    ma_freeship: null,
    giamgia_freeship: '0',
  };

  const paymentRow = {
    mathanhtoan: 100,
    madonhang: 42,
    phuongthuc: PaymentMethod.MOMO,
    trangthai: 'DA_THANH_TOAN',
    sotien: '50000',
  };

  const createDto: CreatePaymentDto = {
    madonhang: 42,
    phuongthuc: PaymentMethod.MOMO,
    mockResult: MockPaymentResult.SUCCESS,
  };

  beforeEach(() => {
    client = { query: jest.fn(), release: jest.fn() };
    pool = { connect: jest.fn().mockResolvedValue(client) };
    service = new PaymentsService(pool as unknown as Pool);

    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('WHERE p.idempotency_key = $1')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('FROM thanhtoan') && sql.includes('LIMIT 1')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('FROM donhang') && sql.includes('FOR UPDATE')) {
        return { rows: [pendingOrder], rowCount: 1 };
      }
      if (sql.includes('INSERT INTO thanhtoan')) {
        return { rows: [paymentRow], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
  });

  it('marks a successful online payment and order as paid in one transaction', async () => {
    const result = await service.create(createDto, 'payment-42', 7);

    expect(result).toMatchObject({
      orderStatus: OrderStatus.PAID,
      paymentStatus: 'DA_THANH_TOAN',
      replayed: false,
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE donhang'),
      [OrderStatus.PAID, 42],
    );
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('keeps COD orders pending until payment is collected', async () => {
    const result = await service.create(
      { madonhang: 42, phuongthuc: PaymentMethod.COD },
      'cod-42',
      7,
    );

    expect(result).toMatchObject({
      orderStatus: OrderStatus.PENDING,
      paymentStatus: 'CHO_THANH_TOAN',
    });
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE donhang'),
      expect.anything(),
    );
  });

  it('marks a failed online payment and order as failed', async () => {
    const result = await service.create(
      { ...createDto, mockResult: MockPaymentResult.FAILURE },
      'payment-failed-42',
      7,
    );

    expect(result).toMatchObject({
      orderStatus: OrderStatus.PAYMENT_FAILED,
      paymentStatus: 'THAT_BAI',
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE donhang'),
      [OrderStatus.PAYMENT_FAILED, 42],
    );
  });

  it('rejects a payment without an authenticated customer', async () => {
    await expect(service.create(createDto, 'payment-42')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('rejects a missing idempotency key', async () => {
    await expect(service.create(createDto, '', 7)).rejects.toThrow(
      BadRequestException,
    );
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('returns the existing payment when the same idempotency key is retried', async () => {
    const existingPayment = {
      ...paymentRow,
      madonhang: 42,
      makh: 7,
      phuongthuc: PaymentMethod.MOMO,
      order_status: OrderStatus.PAID,
    };
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('WHERE p.idempotency_key = $1')) {
        return { rows: [existingPayment], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await service.create(createDto, 'payment-42', 7);

    expect(result).toMatchObject({
      paymentStatus: 'DA_THANH_TOAN',
      orderStatus: OrderStatus.PAID,
      replayed: true,
    });
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO thanhtoan'),
      expect.anything(),
    );
  });

  it('rolls back when an idempotency key is reused for another payment', async () => {
    client.query.mockImplementation(async (sql: string) => {
      if (sql.includes('WHERE p.idempotency_key = $1')) {
        return {
          rows: [{ ...paymentRow, madonhang: 99, makh: 7 }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    await expect(service.create(createDto, 'payment-42', 7)).rejects.toThrow(
      ConflictException,
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
