import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@parking/shared-types';
import { UsersStore } from '../users/users.store';

export interface AuthResult {
  token: string;
  user: User;
}

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersStore,
    private readonly jwt: JwtService,
  ) {}

  async register(email: string, password: string, name?: string): Promise<AuthResult> {
    if (!email || !password || password.length < 8) {
      throw new UnauthorizedException('Email and an 8+ char password are required');
    }
    const user = await this.users.create(email, password, name);
    return this.sign(user);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.verifyPassword(email, password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    return this.sign(user);
  }

  verify(token: string): JwtPayload {
    try {
      return this.jwt.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private sign(user: User): AuthResult {
    const token = this.jwt.sign({ sub: user.id, email: user.email } satisfies JwtPayload);
    return { token, user };
  }
}
