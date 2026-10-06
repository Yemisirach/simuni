import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsIn(['MANAGER', 'AGENT'])
  role: 'MANAGER' | 'AGENT';

  @IsString() @MinLength(6)
  password: string;

  @IsOptional() @IsString()
  vehicle?: string;
}
