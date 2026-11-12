import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  Matches,
  Min,
  MaxLength,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topping?: string[];

  @IsOptional()
  @IsString()
  sugar?: string;

  @IsOptional()
  @IsString()
  ice?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsIn(['DELIVERY', 'PICKUP'])
  deliveryMethod?: 'DELIVERY' | 'PICKUP';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[\p{L}][\p{L}\s'-]*$/u, {
    message: 'Họ tên không được chứa số hoặc ký tự đặc biệt.',
  })
  customerName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^0[0-9]{9}$/, {
    message: 'Số điện thoại phải gồm đúng 10 chữ số và bắt đầu bằng số 0.',
  })
  customerPhone: string;

  @ValidateIf((o) => o.deliveryMethod !== "PICKUP")
  @IsNotEmpty()
  @IsString()
  address: string;

  @ValidateIf((o) => o.deliveryMethod !== "PICKUP")
  @IsNotEmpty()
  @IsString()
  phuong: string;

  @IsNumber()
  @Min(0)
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phiVanChuyenGoc?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  maGiamGia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  maFreeship?: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  makh?: number;
}
