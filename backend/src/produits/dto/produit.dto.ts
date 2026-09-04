import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ProduitVarianteDto {
  @IsString()
  @IsNotEmpty()
  nomOption!: string;

  @IsString()
  @IsNotEmpty()
  valeur!: string;

  @IsOptional()
  @IsInt()
  prixAjustement?: number;
}

export class CreateProduitDto {
  @IsInt()
  categorieId!: number;

  @IsOptional()
  @IsInt()
  marqueId?: number | null;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  codeBarre?: string | null;

  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  unite?: string;

  @IsInt()
  prixAchat!: number;

  @IsInt()
  prixVente!: number;

  @IsOptional()
  @IsInt()
  prixGros?: number | null;

  @IsOptional()
  @IsInt()
  prixPromo?: number | null;

  @IsOptional()
  @IsInt()
  stockMin?: number;

  @IsOptional()
  @IsString()
  emplacement?: string;

  @IsOptional()
  @IsBoolean()
  suitLots?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProduitVarianteDto)
  variantes?: ProduitVarianteDto[];
}

export class UpdateProduitDto {
  @IsOptional()
  @IsInt()
  categorieId?: number;

  @IsOptional()
  @IsInt()
  marqueId?: number | null;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  codeBarre?: string | null;

  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  unite?: string;

  @IsOptional()
  @IsInt()
  prixAchat?: number;

  @IsOptional()
  @IsInt()
  prixVente?: number;

  @IsOptional()
  @IsInt()
  prixGros?: number | null;

  @IsOptional()
  @IsInt()
  prixPromo?: number | null;

  @IsOptional()
  @IsInt()
  stockMin?: number;

  @IsOptional()
  @IsString()
  emplacement?: string;

  @IsOptional()
  @IsBoolean()
  suitLots?: boolean;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProduitVarianteDto)
  variantes?: ProduitVarianteDto[];
}

export interface CreateLotDto {
  numero: string;
  datePeremption?: string | null;
  quantite?: number;
}

export interface UpdateLotDto {
  quantite?: number;
  datePeremption?: string | null;
  numero?: string;
}