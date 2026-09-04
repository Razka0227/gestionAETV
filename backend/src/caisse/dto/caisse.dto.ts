import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SensMouvementCaisse } from '@prisma/client';

export class OuvrirCaisseDto {
  @IsInt()
  @Min(0)
  fondDeCaisse!: number;
}

export class FermerCaisseDto {
  @IsInt()
  @Min(0)
  montantReel!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observation?: string;
}

export class MouvementCaisseDto {
  @IsEnum(SensMouvementCaisse)
  sens!: SensMouvementCaisse;

  @IsInt()
  @Min(1)
  montant!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  motif!: string;
}