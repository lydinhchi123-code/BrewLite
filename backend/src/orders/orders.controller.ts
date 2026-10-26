import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
// TaiKhoanService signs the customer's ID in payload.sub.
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
    // Save the authenticated owner; never accept makh from the request body.
    return this.ordersService.create(
      createOrderDto,
      this.customerIdFromJwt(request),
    );
  }

  @Get()
  findAll() {
    // Existing endpoint retained for compatibility with other team members.
    return this.ordersService.findAll();
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('orderId') orderId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.findOne(
      orderId,
      this.customerIdFromJwt(request),
    );
  }
}
