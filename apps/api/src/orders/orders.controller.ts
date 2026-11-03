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
  constructor(
    private readonly ordersService: OrdersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: any,
  ) {
    console.log("JWT USER:", req.user);

    return this.ordersService.create(
      createOrderDto,
      Number(req.user.sub),
    );
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('admin/dashboard-stats')
  getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }
  
  @Get('khach-hang')
  @UseGuards(JwtAuthGuard)
  findByCustomerId(@Req() req: any) {
    return this.ordersService.findByCustomerId(
      Number(req.user.sub),
    );
  }

  // Lấy chi tiết một đơn hàng
  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const makh = req.user?.sub;

    if (makh == null || !/^\d+$/.test(String(makh))) {
      throw new UnauthorizedException(
        'Không xác định được khách hàng đăng nhập.',
      );
    }

    return this.ordersService.findOne(orderId, String(makh));
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
    return this.ordersService.updateStatus(
      madonhang,
      dto.status,
    );
  }

}