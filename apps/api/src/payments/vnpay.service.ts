import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createHmac, randomUUID } from 'node:crypto';

type CreateVnpayPayment = {
  amount: number;
  orderInfo?: string;
};

@Injectable()
export class VnpayService {
  createPayment(body: CreateVnpayPayment) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const paymentUrl = process.env.VNPAY_PAYMENT_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    if (!tmnCode || !hashSecret || !paymentUrl || !returnUrl) {
      throw new ServiceUnavailableException(
        'VNPay chưa được cấu hình. Hãy kiểm tra các biến VNPAY trong file .env.',
      );
    }
    if (!Number.isInteger(body.amount) || body.amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán không hợp lệ.');
    }

    const orderId = `BL${Date.now()}${randomUUID().replaceAll('-', '').slice(0, 6)}`;
    const now = new Date();
    const expire = new Date(now.getTime() + 15 * 60 * 1000);
    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(body.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: body.orderInfo?.trim() || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: this.formatDate(now),
      vnp_ExpireDate: this.formatDate(expire),
    };

    const signedQuery = this.buildQuery(params);
    const secureHash = createHmac('sha512', hashSecret)
      .update(signedQuery, 'utf8')
      .digest('hex');
    return {
      orderId,
      paymentUrl: `${paymentUrl}?${signedQuery}&vnp_SecureHash=${secureHash}`,
    };
  }

  verifyReturn(query: Record<string, string>) {
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const orderId = query.vnp_TxnRef ?? '';
    const responseCode = query.vnp_ResponseCode ?? '99';
    if (!hashSecret) {
      return { success: false, orderId, responseCode: 'CONFIG_ERROR' };
    }

    const receivedHash = query.vnp_SecureHash ?? '';
    const signedParams = Object.fromEntries(
      Object.entries(query).filter(
        ([key]) => key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType',
      ),
    ) as Record<string, string>;
    const expectedHash = createHmac('sha512', hashSecret)
      .update(this.buildQuery(signedParams), 'utf8')
      .digest('hex');
    return {
      success: receivedHash === expectedHash && responseCode === '00',
      orderId,
      responseCode,
    };
  }

  private buildQuery(params: Record<string, string>) {
    return Object.keys(params)
      .filter((key) => params[key] !== undefined && params[key] !== '')
      .sort()
      .map((key) => `${this.encode(key)}=${this.encode(params[key])}`)
      .join('&');
  }

  private encode(value: string) {
    return encodeURIComponent(value)
      .replace(/%20/g, '+')
      .replace(/[!'()*]/g, (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      );
  }

  private formatDate(date: Date) {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const values = Object.fromEntries(
      parts.map(({ type, value }) => [type, value]),
    );
    return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
  }
}
