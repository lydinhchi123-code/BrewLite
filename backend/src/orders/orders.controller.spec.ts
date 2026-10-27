import { UnauthorizedException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  const ordersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new OrdersController(ordersService as unknown as OrdersService);
  });

  it('được khởi tạo', () => {
    expect(controller).toBeDefined();
  });

  it('lấy ID chủ đơn từ JWT khi xem chi tiết', async () => {
    ordersService.findOne.mockResolvedValue({ orderId: 'ORD-1060' });
    const result = await controller.findOne('ORD-1060', { user: { sub: '12' } });
    expect(ordersService.findOne).toHaveBeenCalledWith('ORD-1060', '12');
    expect(result).toEqual({ orderId: 'ORD-1060' });
  });

  it('không tin mã khách hàng truyền qua payload nếu JWT không có sub', () => {
    expect(() => controller.findOne('ORD-1060', { user: {} })).toThrow(
      UnauthorizedException,
    );
    expect(ordersService.findOne).not.toHaveBeenCalled();
  });

});
