import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { LoaiMaGiamGia } from './create-discount.dto';
import { IsIn } from 'class-validator';

export class UpdateDiscountDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ma?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  ten?: string;

  @IsOptional()
  @IsString()
  mo_ta?: string;

  @IsOptional()
  @IsEnum(LoaiMaGiamGia)
  loai_ma?: LoaiMaGiamGia;

  @IsOptional()
  @IsNumber()
  @Min(1)
  so_tien_giam?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  don_hang_toi_thieu?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  so_luong_toi_da?: number;

  @IsOptional()
  @IsDateString()
  ngay_bat_dau?: string;

  @IsOptional()
  @IsDateString()
  ngay_ket_thuc?: string;

  @IsOptional()
  @IsBoolean()
  moi_khach_mot_lan?: boolean;

  @IsOptional()
  @IsIn(['DANG_SU_DUNG', 'AN', 'HET'])
  trang_thai?: 'DANG_SU_DUNG' | 'AN' | 'HET';
}