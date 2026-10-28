import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Req,
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
  
  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('orderId') orderId: string, @Req() req: any) {
    return this.ordersService.findOne(orderId, req.user?.sub);
  }

  @Get('khach-hang/:makh')
  findByCustomerId(
    @Param('makh', ParseIntPipe) makh: number,
  ) {
    return this.ordersService.findByCustomerId(makh);
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
