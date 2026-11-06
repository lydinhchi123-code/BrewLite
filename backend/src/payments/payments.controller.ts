import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';

type CreatePaymentBody = {
  amount: number;
  orderInfo?: string;
};

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('vnpay')
  createVnpayPayment(@Body() body: CreatePaymentBody) {
    return this.paymentsService.createVnpayPayment(body);
  }

  @Get('vnpay-return')
  handleVnpayReturn(@Query() query: Record<string, string>, @Res() response: Response) {
    const result = this.paymentsService.verifyVnpayReturn(query);
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const status = result.success ? 'success' : 'failure';
    const params = new URLSearchParams({
      status,
      orderId: result.orderId,
      responseCode: result.responseCode,
    });

    return response.redirect(`${frontendUrl}/5TrangThanhToan?${params.toString()}`);
  }
}
