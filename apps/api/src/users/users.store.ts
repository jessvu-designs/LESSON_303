import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { User } from '@parking/shared-types';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma-backed user repository. Seeded by `prisma/seed.ts`.
 */
@Injectable()
export class UsersStore {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | undefined> {
    const rec = await this.prisma.user.findUnique({ where: { id } });
    return rec ? this.toPublic(rec) : undefined;
  }

  async create(email: string, password: string, name?: string): Promise<User> {
    const lower = email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: lower } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 8);
    const rec = await this.prisma.user.create({
      data: { email: lower, passwordHash, name: name ?? null },
    });
    return this.toPublic(rec);
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const rec = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!rec) return null;
    const ok = await bcrypt.compare(password, rec.passwordHash);
    return ok ? this.toPublic(rec) : null;
  }

  private toPublic(rec: { id: string; email: string; name: string | null }): User {
    return { id: rec.id, email: rec.email, name: rec.name ?? undefined };
  }
}
