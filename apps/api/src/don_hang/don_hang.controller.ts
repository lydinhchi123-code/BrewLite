import { BadRequestException, Controller, Get, Param } from '@nestjs/common';
import { DonHangService } from './don_hang.service';

@Controller('don_hang')
export class DonHangController {
  constructor(private readonly donHangService: DonHangService) {}

  @Get('khach-hang/:makh')
  getLichSuDonHang(@Param('makh') makh: string) {
    if (!/^\d+$/.test(makh)) {
      throw new BadRequestException('Mã khách hàng không hợp lệ');
    }

    return this.donHangService.getLichSuDonHang(makh);
  }
}
