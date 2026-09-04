import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  motDePasse!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsInt()
  boutiqueId?: number;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  motDePasse?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsInt()
  boutiqueId?: number | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}