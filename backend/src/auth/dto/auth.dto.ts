import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  motDePasse!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  ancienMotDePasse!: string;

  @IsString()
  @MinLength(6)
  nouveauMotDePasse!: string;
}