import { ArrayNotEmpty, IsArray, IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateRouteDto {
  @IsString()
  name: string;

  @IsDateString()
  date: string;

  @IsOptional() @IsString()
  agentId?: string;

  @IsArray() @ArrayNotEmpty()
  customerIds: string[];
}
