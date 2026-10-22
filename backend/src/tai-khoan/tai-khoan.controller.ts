import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { TaiKhoanService } from './tai-khoan.service';

@Controller('tai-khoan')
export class TaiKhoanController {
  constructor(private readonly taiKhoanService: TaiKhoanService) {}

  @Post('dang-ky')
  dangKy(
    @Body()
    body: {
      hoten: string;
      sodienthoai: string;
      email?: string;
      matkhau: string;
    },
  ) {
    return this.taiKhoanService.dangKy(body);
  }

  @Post('dang-nhap')
  @HttpCode(HttpStatus.OK)
  dangNhap(
    @Body()
    body: {
      taikhoan: string;
      matkhau: string;
    },
  ) {
    return this.taiKhoanService.dangNhap(body);
  }
}