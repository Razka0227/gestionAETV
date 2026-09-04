import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCategorieDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCategorieDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @IsString()
  description?: string;
}