import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemInput {
  @IsString()
  productId: string;

  @IsInt() @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsString()
  customerId: string;

  @IsOptional() @IsString()
  routeId?: string;

  @IsArray() @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  items: OrderItemInput[];
}
