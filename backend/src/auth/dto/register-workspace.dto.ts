import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterWorkspaceDto {
  @IsString()
  workspaceName: string;

  @IsString()
  ownerName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(6)
  password: string;
}
