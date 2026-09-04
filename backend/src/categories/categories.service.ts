import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateCategorieDto,
  UpdateCategorieDto,
} from './dto/categorie.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const rows = await this.prisma.categorie.findMany({
      include: {
        parent: { select: { id: true, nom: true } },
        _count: { select: { produits: true, sousCategories: true } },
      },
      orderBy: { nom: 'asc' },
    });
    return rows;
  }

  /** Arbre imbriqué (catégories parentes puis sous-catégories). */
  async tree() {
    const rows = await this.prisma.categorie.findMany({
      include: { _count: { select: { produits: true } } },
      orderBy: { nom: 'asc' },
    });
    const byId = new Map<number, (typeof rows)[number] & { children: unknown[] }>();
    for (const r of rows) {
      byId.set(r.id, { ...r, children: [] });
    }
    const roots: (typeof rows)[number][] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async create(dto: CreateCategorieDto) {
    const existing = await this.prisma.categorie.findFirst({
      where: { nom: dto.nom, parentId: dto.parentId ?? null },
    });
    if (existing) throw new ConflictException('Cette catégorie existe déjà à ce niveau');
    return this.prisma.categorie.create({
      data: {
        nom: dto.nom,
        parentId: dto.parentId ?? null,
        description: dto.description,
      },
    });
  }

  async update(id: number, dto: UpdateCategorieDto) {
    const cat = await this.prisma.categorie.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    if (dto.parentId === id) {
      throw new BadRequestException('Une catégorie ne peut pas être son propre parent');
    }
    return this.prisma.categorie.update({
      where: { id },
      data: {
        nom: dto.nom,
        parentId: dto.parentId === undefined ? undefined : dto.parentId,
        description: dto.description,
      },
    });
  }

  async remove(id: number) {
    const cat = await this.prisma.categorie.findUnique({
      where: { id },
      include: { _count: { select: { produits: true, sousCategories: true } } },
    });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    if (cat._count.produits > 0 || cat._count.sousCategories > 0) {
      throw new ConflictException(
        'Impossible de supprimer : la catégorie contient des produits ou des sous-catégories',
      );
    }
    await this.prisma.categorie.delete({ where: { id } });
    return { ok: true };
  }
}