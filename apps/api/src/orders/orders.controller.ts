import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  ParseIntPipe,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UnauthorizedException,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  create(@Body() createOrderDto: CreateOrderDto, @Req() req: any) {
    return this.ordersService.create(createOrderDto, req.user?.sub);
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('admin/dashboard-stats')
  getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyOrders(@Req() req: any) {
    return this.ordersService.findByCustomerId(req.user?.sub);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('orderId') orderId: string, @Req() req: any) {
    const makh = req.user?.sub;

    if (makh == null || !/^\d+$/.test(String(makh))) {
      throw new UnauthorizedException(
        'Không xác định được khách hàng đăng nhập.',
      );
    }
    return this.ordersService.findOne(orderId, req.user?.sub);
  }

  @Patch(':madonhang/status')
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  updateStatus(
    @Param('madonhang', ParseIntPipe) madonhang: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(madonhang, dto.status);
  }

  @Patch(':orderId/cancel')
  @UseGuards(JwtAuthGuard)
  cancelOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const makh = req.user?.sub;

    if (makh == null || !/^\d+$/.test(String(makh))) {
      throw new UnauthorizedException(
        'Không xác định được khách hàng đăng nhập.',
      );
    }

    return this.ordersService.cancelOrder(orderId, String(makh));
  }

  @Patch(':orderId/received')
  @UseGuards(JwtAuthGuard)
  confirmReceipt(@Param('orderId') orderId: string, @Req() req: any) {
    const makh = req.user?.sub;

    if (makh == null || !/^\d+$/.test(String(makh))) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập để xác nhận đã nhận đơn hàng.',
      );
    }

    return this.ordersService.confirmReceipt(orderId, String(makh));
  }
}
