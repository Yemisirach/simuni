import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  sku?: string;

  @IsOptional() @IsString()
  unit?: string;

  @IsNumber() @Min(0)
  price: number;

  @IsOptional()
  isActive?: boolean;
}
