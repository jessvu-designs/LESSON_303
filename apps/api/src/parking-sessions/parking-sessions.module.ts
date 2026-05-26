import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ProvidersModule } from '../providers/providers.module';
import { ParkingSessionsController } from './parking-sessions.controller';
import { ParkingSessionsService } from './parking-sessions.service';

@Module({
  imports: [ProvidersModule, PaymentsModule],
  controllers: [ParkingSessionsController],
  providers: [ParkingSessionsService],
})
export class ParkingSessionsModule {}
