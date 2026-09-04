import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateBoutiqueDto,
  UpdateBoutiqueDto,
} from './dto/boutique.dto.js';

@Injectable()
export class BoutiquesService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.boutique.findMany({
      include: { _count: { select: { utilisateurs: true } } },
      orderBy: { id: 'asc' },
    });
  }

  async getById(id: number) {
    const boutique = await this.prisma.boutique.findUnique({
      where: { id },
      include: { _count: { select: { utilisateurs: true, ventes: true } } },
    });
    if (!boutique) throw new NotFoundException('Boutique introuvable');
    return boutique;
  }

  create(dto: CreateBoutiqueDto) {
    return this.prisma.boutique.create({
      data: { ...dto, devise: dto.devise ?? 'XOF' },
    });
  }

  async update(id: number, dto: UpdateBoutiqueDto) {
    await this.getById(id);
    return this.prisma.boutique.update({ where: { id }, data: dto });
  }
}