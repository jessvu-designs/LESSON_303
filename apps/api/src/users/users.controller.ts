import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PaymentMethod, User, Vehicle } from '@parking/shared-types';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersStore } from './users.store';

interface VehicleBody {
  licensePlate?: string;
  state?: string | null;
  nickname?: string | null;
  isDefault?: boolean;
}

function toVehicle(r: {
  id: string;
  userId: string;
  licensePlate: string;
  state: string | null;
  nickname: string | null;
  isDefault: boolean;
}): Vehicle {
  return {
    id: r.id,
    userId: r.userId,
    licensePlate: r.licensePlate,
    state: r.state ?? undefined,
    nickname: r.nickname ?? undefined,
    isDefault: r.isDefault,
  };
}

function normalizePlate(input: string | undefined): string {
  return (input ?? '').trim().toUpperCase().replace(/\s+/g, '');
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly users: UsersStore,
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('me')
  async me(@CurrentUser() current: { id: string }): Promise<User> {
    const user = await this.users.findById(current.id);
    if (!user) throw new NotFoundException();
    return user;
  }

  @Get('me/vehicles')
  async vehicles(@CurrentUser() current: { id: string }): Promise<Vehicle[]> {
    const rows = await this.prisma.parkingVehicle.findMany({
      where: { userId: current.id },
      orderBy: [{ isDefault: 'desc' }, { id: 'asc' }],
    });
    return rows.map(toVehicle);
  }

  @Post('me/vehicles')
  async createVehicle(
    @CurrentUser() current: { id: string },
    @Body() body: VehicleBody,
  ): Promise<Vehicle> {
    const plate = normalizePlate(body.licensePlate);
    if (!plate) throw new BadRequestException('licensePlate is required');

    const existingCount = await this.prisma.parkingVehicle.count({
      where: { userId: current.id },
    });
    const shouldBeDefault = body.isDefault ?? existingCount === 0;

    const created = await this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.parkingVehicle.updateMany({
          where: { userId: current.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.parkingVehicle.create({
        data: {
          userId: current.id,
          licensePlate: plate,
          state: body.state?.trim() || null,
          nickname: body.nickname?.trim() || null,
          isDefault: shouldBeDefault,
        },
      });
    });
    return toVehicle(created);
  }

  @Patch('me/vehicles/:id')
  async updateVehicle(
    @CurrentUser() current: { id: string },
    @Param('id') id: string,
    @Body() body: VehicleBody,
  ): Promise<Vehicle> {
    const existing = await this.prisma.parkingVehicle.findUnique({ where: { id } });
    if (!existing || existing.userId !== current.id) {
      throw new NotFoundException('Vehicle not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.parkingVehicle.updateMany({
          where: { userId: current.id, isDefault: true, NOT: { id } },
          data: { isDefault: false },
        });
      }
      return tx.parkingVehicle.update({
        where: { id },
        data: {
          licensePlate:
            body.licensePlate !== undefined ? normalizePlate(body.licensePlate) : undefined,
          state: body.state !== undefined ? (body.state?.trim() || null) : undefined,
          nickname:
            body.nickname !== undefined ? (body.nickname?.trim() || null) : undefined,
          isDefault: body.isDefault ?? undefined,
        },
      });
    });
    return toVehicle(updated);
  }

  @Delete('me/vehicles/:id')
  @HttpCode(204)
  async deleteVehicle(
    @CurrentUser() current: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    const existing = await this.prisma.parkingVehicle.findUnique({ where: { id } });
    if (!existing || existing.userId !== current.id) {
      throw new NotFoundException('Vehicle not found');
    }
    const activeSession = await this.prisma.parkingSession.findFirst({
      where: { vehicleId: id, status: 'active' },
      select: { id: true },
    });
    if (activeSession) {
      throw new BadRequestException('Cannot delete a vehicle with an active session');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.parkingVehicle.delete({ where: { id } });
      // Promote another vehicle to default if we just removed it.
      if (existing.isDefault) {
        const next = await tx.parkingVehicle.findFirst({
          where: { userId: current.id },
          orderBy: { id: 'asc' },
        });
        if (next) {
          await tx.parkingVehicle.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }

  @Get('me/payment-methods')
  paymentMethods(@CurrentUser() current: { id: string }): Promise<PaymentMethod[]> {
    return this.payments.listForUser(current.id);
  }
}
