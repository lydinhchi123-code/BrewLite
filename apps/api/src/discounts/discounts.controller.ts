import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { CheckDiscountDto } from './dto/check-discount.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('discounts')
export class DiscountsController {
  constructor(
    private readonly discountsService: DiscountsService,
  ) {}

  // Khách hàng: xem danh sách mã đang hoạt động
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req: any) {
    return this.discountsService.findAll(
      Number(req.user.sub),
    );
  }

  // Admin: xem tất cả mã
  @Get('admin/all')
  findAllForAdmin() {
    return this.discountsService.findAllForAdmin();
  }

  // Admin: xem lịch sử sử dụng của một mã
  @Get('admin/:id/history')
  getHistory(@Param('id') id: string) {
    return this.discountsService.getHistory(id);
  }

  // Khách hàng: kiểm tra mã giảm giá
  @Post('check')
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  checkDiscount(
    @Body() dto: CheckDiscountDto,
    @Req() req: any,
  ) {
    return this.discountsService.checkDiscount(
      dto.ma,
      Number(req.user.sub),
      dto.tamTinh,
      dto.phiVanChuyenGoc,
    );
  }

  // Admin: tạo mã giảm giá
  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  create(@Body() dto: CreateDiscountDto) {
    return this.discountsService.create(dto);
  }

  // Admin: cập nhật mã giảm giá
  @Patch(':id')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    return this.discountsService.update(id, dto);
  }

  // Admin: ẩn mã giảm giá
  @Patch(':id/status')
    toggleStatus(@Param('id') id: string) {
      return this.discountsService.toggleStatus(id);
    }

  // Khách hàng: xem chi tiết mã theo mã code
  @Get(':ma')
  findOne(@Param('ma') ma: string) {
    return this.discountsService.findOne(ma);
  }
}