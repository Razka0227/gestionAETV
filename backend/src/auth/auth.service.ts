import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Utilisateur } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto.js';

export type SafeUser = Omit<Utilisateur, 'motDePasseHash'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  sanitize(user: Utilisateur): SafeUser {
    const { motDePasseHash: _hash, ...safe } = user;
    return safe;
  }

  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.utilisateur.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(dto.motDePasse, user.motDePasseHash))) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    if (!user.actif) {
      throw new UnauthorizedException('Compte désactivé. Contactez l’administrateur.');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken, user: this.sanitize(user) };
  }

  async profile(userId: number): Promise<SafeUser> {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
      include: { boutique: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return this.sanitize(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.utilisateur.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (!(await bcrypt.compare(dto.ancienMotDePasse, user.motDePasseHash))) {
      throw new UnauthorizedException('Ancien mot de passe incorrect');
    }
    const motDePasseHash = await bcrypt.hash(dto.nouveauMotDePasse, 10);
    await this.prisma.utilisateur.update({
      where: { id: userId },
      data: { motDePasseHash },
    });
    return { ok: true };
  }
}