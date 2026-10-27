import { IsEnum, IsInt, Min } from 'class-validator';

export enum PaymentMethod {
  COD = 'COD',
  BANKING = 'BANKING',
  MOMO = 'MOMO',
}

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  madonhang: number;

  @IsEnum(PaymentMethod)
  phuongthuc: PaymentMethod;
}