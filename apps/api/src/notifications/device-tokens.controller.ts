import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

interface RegisterDeviceBody {
  token: string;
  platform?: 'ios' | 'android' | 'web';
}

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceTokensController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('register')
  @HttpCode(200)
  async register(
    @CurrentUser() user: { id: string },
    @Body() body: RegisterDeviceBody,
  ): Promise<{ ok: true }> {
    const token = (body.token ?? '').trim();
    if (!token) return { ok: true };
    await this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId: user.id, platform: body.platform ?? null },
      create: { token, userId: user.id, platform: body.platform ?? null },
    });
    return { ok: true };
  }

  @Delete(':token')
  @HttpCode(204)
  async unregister(
    @CurrentUser() user: { id: string },
    @Param('token') token: string,
  ): Promise<void> {
    await this.prisma.deviceToken.deleteMany({
      where: { token, userId: user.id },
    });
  }
}
