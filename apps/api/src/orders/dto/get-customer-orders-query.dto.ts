import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '../order-state-machine';

export class GetCustomerOrdersQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: 'Trạng thái đơn hàng không hợp lệ.',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsDateString(
    { strict: true },
    {
      message:
        'fromDate phải là ngày hợp lệ theo định dạng YYYY-MM-DD hoặc ISO 8601.',
    },
  )
  fromDate?: string;

  @IsOptional()
  @IsDateString(
    { strict: true },
    {
      message:
        'toDate phải là ngày hợp lệ theo định dạng YYYY-MM-DD hoặc ISO 8601.',
    },
  )
  toDate?: string;
}
