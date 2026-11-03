import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export enum LoaiMaGiamGia {
  NEW_CUSTOMER = 'NEW_CUSTOMER',
  MONTHLY = 'MONTHLY',
  HOLIDAY = 'HOLIDAY',
  OTHER = 'OTHER',
}

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  ma: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  ten: string;

  @IsOptional()
  @IsString()
  mo_ta?: string;

  @IsEnum(LoaiMaGiamGia)
  loai_ma: LoaiMaGiamGia;

  @IsNumber()
  @Min(1)
  so_tien_giam: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  don_hang_toi_thieu?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  so_luong_toi_da?: number;

  @IsDateString()
  ngay_bat_dau: string;

  @IsDateString()
  ngay_ket_thuc: string;

  @IsOptional()
  @IsBoolean()
  moi_khach_mot_lan?: boolean;
}