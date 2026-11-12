import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CheckDiscountDto {
  @IsString()
  @IsNotEmpty()
  ma: string;

  @IsNumber()
  @Min(0)
  tamTinh: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  phiVanChuyenGoc?: number;
}