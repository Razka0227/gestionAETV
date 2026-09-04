import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBoutiqueDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  devise?: string;
}

export class UpdateBoutiqueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  devise?: string;
}