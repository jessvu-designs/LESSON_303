import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { UsersController } from './users.controller';
import { UsersStore } from './users.store';

@Module({
  imports: [PaymentsModule],
  controllers: [UsersController],
  providers: [UsersStore],
  exports: [UsersStore],
})
export class UsersModule {}
