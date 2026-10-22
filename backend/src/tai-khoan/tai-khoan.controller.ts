import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { TaiKhoanService } from './tai-khoan.service';

@Controller('tai-khoan')
export class TaiKhoanController {
  constructor(private readonly taiKhoanService: TaiKhoanService) {}

  // Đăng ký tài khoản
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

  // Đăng nhập
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

  // Cập nhật thông tin cá nhân
  @Put('cap-nhat/:makh')
  capNhat(
    @Param('makh', ParseIntPipe) makh: number,
    @Body()
    body: {
      hoten: string;
      sodienthoai: string;
      email?: string | null;
    },
  ) {
    return this.taiKhoanService.capNhat(makh, body);
  }
}