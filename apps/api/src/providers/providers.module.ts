import { Module } from '@nestjs/common';
import { MockConnector } from './connectors/mock.connector';
import { SeattleConnector } from './connectors/seattle.connector';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  controllers: [ProvidersController],
  providers: [MockConnector, SeattleConnector, ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
