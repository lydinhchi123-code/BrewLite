import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Pool } from 'pg';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService - xác nhận đơn hàng', () => {
  let service: OrdersService;
  let pool: { query: jest.Mock; connect: jest.Mock };

  const orderRow = {
    orderId: 'ORD-1060',
    orderStatus: 'DA_TIEP_NHAN',
    paymentStatus: 'DA_THANH_TOAN',
    paymentMethod: 'MOMO',
    recipientName: 'Minh Anh',
    recipientPhone: '0901234567',
    deliveryAddress: '123 Đường A',
    province: 'TP.HCM',
    note: null,
    subtotal: '40000',
    deliveryFee: '0',
    discount: '0',
    totalAmount: '40000',
    createdAt: new Date('2026-10-26T10:00:00Z'),
    paidAt: new Date('2026-10-26T10:01:00Z'),
    items: [{
      name: 'Cà phê sữa',
      size: 'M',
      options: 'Đường: 50%',
      quantity: 1,
      price: 40000,
      lineTotal: 40000,
    }],
  };

  beforeEach(() => {
    pool = { query: jest.fn(), connect: jest.fn() };
    service = new OrdersService(pool as unknown as Pool);
  });

  it('trả về thông tin đơn, món và trạng thái thanh toán khi đúng chủ sở hữu', async () => {
    pool.query.mockResolvedValue({ rows: [orderRow] });

    const order = await service.findOne('ORD-1060', '12');

    expect(order).toMatchObject({
      orderId: 'ORD-1060',
      orderStatus: 'DA_TIEP_NHAN',
      paymentStatus: 'DA_THANH_TOAN',
      paymentMethod: 'MOMO',
      totalAmount: 40000,
      items: [{ name: 'Cà phê sữa', size: 'M', quantity: 1, price: 40000 }],
    });
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('d.makh = $2::bigint'),
      ['ORD-1060', '12'],
    );
    expect(pool.query).toHaveBeenCalledTimes(1); // Read only, no UPDATE.
  });

  it('trả về 404 nếu đơn hàng không tồn tại', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await expect(service.findOne('ORD-9999', '12')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('chặn khách hàng đọc đơn của người khác (không tiết lộ đơn tồn tại)', async () => {
    // Mock database respects SQL's WHERE ... AND d.makh = $2::bigint.
    pool.query.mockImplementation(async (_query: string, args: string[]) => ({
      rows: args[1] === '12' ? [orderRow] : [],
    }));

    await expect(service.findOne('ORD-1060', '999')).rejects.toThrow(
      NotFoundException,
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('d.makh = $2::bigint'),
      ['ORD-1060', '999'],
    );
  });

  it('từ chối mã đơn không hợp lệ', async () => {
    await expect(service.findOne('ORD-1060; DROP TABLE donhang', '12'))
      .rejects.toThrow(BadRequestException);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('từ chối khi không có mã khách hàng xác thực', async () => {
    await expect(service.findOne('ORD-1060', '')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('lưu makh từ JWT khi tạo đơn để chủ đơn có thể xem xác nhận', async () => {
    const client = {
      query: jest.fn(),
      release: jest.fn(),
    };
    client.query.mockImplementation(async (sql: string) => {
    // Truy vấn sản phẩm.
    if (sql.includes('FROM menu_products')) {
      return {
        rowCount: 1,
        rows: [{
          id: 1,
          name: 'Cà phê sữa',
          base_price: 40000,
          is_available: true,
          image_url: null,
          stock_quantity: 0,
          track_inventory: false,
          category_slug: 'banh',
        }],
      };
    }

    // Tìm công thức sản phẩm.
    if (sql.includes('FROM recipes r')) {
      return {
        rowCount: 1,
        rows: [{ id: 1 }],
      };
    }

    // Lấy nguyên liệu trong công thức.
    if (sql.includes('FROM recipe_details rd')) {
      return {
        rowCount: 1,
        rows: [{
          ingredient_id: 1,
          ingredient_name: 'Sữa',
          quantity: 10,
          unit: 'ml',
          base_unit: 'ml',
        }],
      };
    }

    // Kiểm tra tồn kho nguyên liệu.
    if (sql.includes('FROM ingredients i')) {
      return {
        rowCount: 1,
        rows: [{
          name: 'Sữa',
          base_unit: 'ml',
          is_active: true,
          stock_quantity: 100,
        }],
      };
    }

    // Tạo đơn hàng.
    if (sql.includes('INSERT INTO donhang')) {
      return {
        rowCount: 1,
        rows: [{
          madonhang: '2',
          madonhanghienthi: 'ORD-1060',
        }],
      };
    }

    // Cập nhật tồn kho nguyên liệu.
    if (sql.includes('UPDATE ingredient_inventory')) {
      return {
        rowCount: 1,
        rows: [{ stock_quantity: 90 }],
      };
    }

    return { rowCount: 1, rows: [] };
  });
    pool.connect.mockResolvedValue(client);

    const createDto = {
      customerName: 'Minh Anh',
      customerPhone: '0901234567',
      address: '123 Đường A',
      phuong: 'TP.HCM',
      subtotal: 40000,
      totalAmount: 40000,
      items: [
        {
          id: '1',
          name: 'Cà phê sữa',
          price: 40000,
          quantity: 1,
        },
      ],
    } as CreateOrderDto;

    const result = await service.create(createDto, '12');

    const insertCall = client.query.mock.calls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('INSERT INTO donhang'),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall[0]).toContain('makh');
    expect(insertCall[1][1]).toBe(12);
    expect(result.orderId).toBe('ORD-1060');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('giữ nguyên trạng thái đang chờ thanh toán (không tự xác nhận thành công)', async () => {
    pool.query.mockResolvedValue({
      rows: [{ ...orderRow, paymentStatus: 'CHO_THANH_TOAN', paymentMethod: null, paidAt: null }],
    });

    const result = await service.findOne('ORD-1060', '12');
    expect(result.paymentStatus).toBe('CHO_THANH_TOAN');
    expect(result.paymentMethod).toBeNull();
  });
});
