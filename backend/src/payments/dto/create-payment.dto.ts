import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export enum PaymentMethod {
  COD = 'COD',
  BANKING = 'BANKING',
  MOMO = 'MOMO',
}

export enum MockPaymentResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  madonhang: number;

  @IsEnum(PaymentMethod)
  phuongthuc: PaymentMethod;

  @IsOptional()
  @IsEnum(MockPaymentResult)
  mockResult?: MockPaymentResult;
}
