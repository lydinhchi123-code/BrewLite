import {
  Body,
  Controller,
  Headers,
  Post,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VnpayService } from './vnpay.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vnpayService: VnpayService,
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
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() req: any,
  ) {
    return this.paymentsService.create(
      dto,
      idempotencyKey,
      req.user?.sub,
    );
  }

  @Post('vnpay')
  createVnpayPayment(@Body() body: { amount: number; orderInfo?: string }) {
    return this.vnpayService.createPayment(body);
  }

  @Get('vnpay-return')
  handleVnpayReturn(
    @Query() query: Record<string, string>,
    @Res() response: Response,
  ) {
    const result = this.vnpayService.verifyReturn(query);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const params = new URLSearchParams({
      status: result.success ? 'success' : 'failure',
      orderId: result.orderId,
      responseCode: result.responseCode,
    });
    return response.redirect(
      `${frontendUrl}/4TrangThanhToan?${params.toString()}`,
    );
  }
}