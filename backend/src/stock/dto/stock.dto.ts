import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { TypeMouvementStock } from '@prisma/client';

export class AjustementStockDto {
  @IsInt()
  produitId!: number;

  @IsEnum(TypeMouvementStock)
  type!: TypeMouvementStock;

  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  quantite!: number;

  @IsString()
  @IsNotEmpty()
  motif!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

export class InventaireLigneDto {
  @IsInt()
  produitId!: number;

  @IsInt()
  @Min(0)
  qteReelle!: number;
}

export class CreateInventaireDto {
  @IsOptional()
  lignes?: InventaireLigneDto[];
}