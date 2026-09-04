import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ModePaiement } from '@prisma/client';

export class CreateDepenseDto {
  @IsInt()
  categorieId!: number;

  @IsInt()
  @Min(1)
  montant!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(ModePaiement)
  modePaiement?: ModePaiement;
}

export class CreateCategorieDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nom!: string;
}