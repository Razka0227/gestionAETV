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
import { ModePaiement } from '@prisma/client';

export class CommandeLigneDto {
  @IsInt()
  produitId!: number;

  @IsInt()
  @Min(1)
  quantite!: number;

  @IsInt()
  @Min(0)
  prixUnitaire!: number;
}

export class CreateCommandeAchatDto {
  @IsInt()
  fournisseurId!: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(ModePaiement)
  modePaiement?: ModePaiement;

  @IsOptional()
  @IsInt()
  @Min(0)
  remise?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  fraisTransport?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  taxe?: number;

  @IsOptional()
  @IsDateString()
  echeance?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommandeLigneDto)
  lignes: CommandeLigneDto[] = [];
}

export class ReceptionLigneDto {
  @IsInt()
  ligneId!: number;

  @IsInt()
  @Min(0)
  quantiteRecue!: number;
}

export class ReceptionCommandeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceptionLigneDto)
  lignes: ReceptionLigneDto[] = [];
}

export class PaiementCommandeDto {
  @IsInt()
  @Min(1)
  montant!: number;

  @IsOptional()
  @IsEnum(ModePaiement)
  mode?: ModePaiement;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;
}