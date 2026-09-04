import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filters?: { role?: Role; actif?: boolean }) {
    const users = await this.prisma.utilisateur.findMany({
      where: {
        role: filters?.role,
        actif: filters?.actif,
      },
      include: { boutique: { select: { id: true, nom: true } } },
      orderBy: { id: 'asc' },
    });
    return users.map(({ motDePasseHash: _h, ...user }) => user);
  }

  async getById(id: number) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id },
      include: { boutique: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const { motDePasseHash: _h, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.utilisateur.findUnique({
      where: { email },
    });
    if (existing) throw new ConflictException('Cet email est déjà utilisé');

    const motDePasseHash = await bcrypt.hash(dto.motDePasse, 10);
    const user = await this.prisma.utilisateur.create({
      data: {
        nom: dto.nom,
        email,
        motDePasseHash,
        role: dto.role,
        boutiqueId: dto.boutiqueId ?? null,
        actif: dto.actif ?? true,
      },
    });
    return this.getById(user.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const existing = await this.prisma.utilisateur.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');

    const data: Record<string, unknown> = {};
    if (dto.nom !== undefined) data.nom = dto.nom;
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      const conflict = await this.prisma.utilisateur.findFirst({
        where: { email, id: { not: id } },
      });
      if (conflict) throw new ConflictException('Cet email est déjà utilisé');
      data.email = email;
    }
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.actif !== undefined) data.actif = dto.actif;
    if (dto.boutiqueId !== undefined) data.boutiqueId = dto.boutiqueId;
    if (dto.motDePasse) {
      data.motDePasseHash = await bcrypt.hash(dto.motDePasse, 10);
    }

    const user = await this.prisma.utilisateur.update({
      where: { id },
      data,
    });
    return this.getById(user.id);
  }

  /** Désactivation (pas de suppression physique pour préserver l'audit). */
  async deactivate(id: number) {
    const existing = await this.prisma.utilisateur.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Utilisateur introuvable');
    await this.prisma.utilisateur.update({
      where: { id },
      data: { actif: false },
    });
    const user = await this.prisma.utilisateur.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const { motDePasseHash: _h, ...safe } = user;
    return safe;
  }

  /** Création d'un utilisateur sur-mesure (seed / cli) */
  async createDirect(data: {
    nom: string;
    email: string;
    motDePasse: string;
    role: Role;
    boutiqueId?: number | null;
  }) {
    const motDePasseHash = await bcrypt.hash(data.motDePasse, 10);
    return this.prisma.utilisateur.create({
      data: {
        nom: data.nom,
        email: data.email.toLowerCase().trim(),
        motDePasseHash,
        role: data.role,
        boutiqueId: data.boutiqueId ?? null,
      },
    });
  }
}