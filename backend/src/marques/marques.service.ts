import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateMarqueDto {
  @IsString()
  @IsNotEmpty()
  nom!: string;
}

@Injectable()
export class MarquesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.marque.findMany({
      include: { _count: { select: { produits: true } } },
      orderBy: { nom: 'asc' },
    });
  }

  async create(nom: string) {
    return this.prisma.marque.create({ data: { nom } });
  }

  async update(id: number, nom: string) {
    const marque = await this.prisma.marque.findUnique({ where: { id } });
    if (!marque) throw new NotFoundException('Marque introuvable');
    return this.prisma.marque.update({ where: { id }, data: { nom } });
  }

  async remove(id: number) {
    const marque = await this.prisma.marque.findUnique({
      where: { id },
      include: { _count: { select: { produits: true } } },
    });
    if (!marque) throw new NotFoundException('Marque introuvable');
    if (marque._count.produits > 0) {
      return {
        error: true,
        message: 'Impossible de supprimer : des produits utilisent cette marque',
      };
    }
    await this.prisma.marque.delete({ where: { id } });
    return { ok: true };
  }
}