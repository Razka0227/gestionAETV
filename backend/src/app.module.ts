import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CaisseModule } from './caisse/caisse.module.js';
import { DepensesModule } from './depenses/depenses.module.js';
import { AchatsModule } from './achats/achats.module.js';
import { BoutiquesModule } from './boutiques/boutiques.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { FournisseursModule } from './fournisseurs/fournisseurs.module.js';
import { MarquesModule } from './marques/marques.module.js';
import { ParametresModule } from './parametres/parametres.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProduitsModule } from './produits/produits.module.js';
import { RapportsModule } from './rapports/rapports.module.js';
import { StockModule } from './stock/stock.module.js';
import { UsersModule } from './users/users.module.js';
import { VentesModule } from './ventes/ventes.module.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get('JWT_SECRET') ?? 'dev-secret-a-changer',
        signOptions: { expiresIn: cfg.get('JWT_EXPIRES_IN') ?? '8h' },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    BoutiquesModule,
    ParametresModule,
    AuditModule,
    DashboardModule,
    CategoriesModule,
    MarquesModule,
    ProduitsModule,
    FournisseursModule,
    AchatsModule,
    StockModule,
    ClientsModule,
    VentesModule,
    DepensesModule,
    CaisseModule,
    RapportsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}