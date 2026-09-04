import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { ModePaiement, TypeVente } from '@prisma/client';

export class VenteItemDto {
  @IsInt()
  produitId!: number;

  @IsInt()
  @Min(1)
  quantite!: number;

  @IsInt()
  @Min(0)
  prixUnitaire!: number;

  @IsOptional()
  @IsString()
  varianteDetail?: string;
}

export class CreateVenteDto {
  @IsOptional()
  @IsInt()
  clientId?: number | null;

  @IsOptional()
  @IsEnum(TypeVente)
  typeVente?: TypeVente;

  @IsEnum(ModePaiement)
  modePaiement!: ModePaiement;

  @IsOptional()
  @IsInt()
  @Min(0)
  remise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  montantEncaisser?: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenteItemDto)
  items: VenteItemDto[] = [];
}

export class PaiementVenteDto {
  @IsInt()
  @Min(1)
  montant!: number;

  @IsOptional()
  @IsEnum(ModePaiement)
  mode?: ModePaiement;

  @IsOptional()
  @IsDateString()
  date?: string;
}

export class CreerRetourDto {
  @IsString()
  @IsNotEmpty()
  motif!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VenteItemDto)
  lignes: VenteItemDto[] = [];
}