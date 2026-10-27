import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// JwtAuthGuard sets request.user from the signed login JWT.
interface AuthenticatedRequest {
  user?: { sub?: string | number };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private customerIdFromJwt(request: AuthenticatedRequest): string {
    const sub = request.user?.sub;
    const customerId =
      typeof sub === 'number' && Number.isSafeInteger(sub)
        ? String(sub)
        : typeof sub === 'string'
          ? sub
          : '';

    if (!/^[1-9]\d*$/.test(customerId)) {
      throw new UnauthorizedException('Token không chứa mã khách hàng hợp lệ');
    }

    return customerId;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    // Never accept makh from the request body.
    return this.ordersService.create(
      createOrderDto,
      this.customerIdFromJwt(request),
    );
  }

  @Put(':orderId')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @Param('orderId') orderId: string,
    @Body() updateOrderDto: CreateOrderDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.update(
      orderId,
      updateOrderDto,
      this.customerIdFromJwt(request),
    );
  }

  @Get()
  findAll() {
    return this.ordersService.findAll();
  }

  @Get('khach-hang/:makh')
  findByCustomerId(@Param('makh', ParseIntPipe) makh: number) {
    return this.ordersService.findByCustomerId(makh);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('orderId') orderId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.findOne(orderId, this.customerIdFromJwt(request));
  }
}
