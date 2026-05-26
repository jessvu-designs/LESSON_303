import { Module } from '@nestjs/common';
import { DeviceTokensController } from './device-tokens.controller';
import { ExpoPushService } from './expo-push.service';
import { ReminderScheduler } from './reminder.scheduler';

@Module({
  controllers: [DeviceTokensController],
  providers: [ExpoPushService, ReminderScheduler],
  exports: [ExpoPushService],
})
export class NotificationsModule {}
