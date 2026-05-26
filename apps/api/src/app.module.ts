import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ParkingSessionsModule } from './parking-sessions/parking-sessions.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    PaymentsModule,
    ProvidersModule,
    ParkingSessionsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
