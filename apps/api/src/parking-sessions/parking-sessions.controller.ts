import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { ExtendSessionRequest, StartSessionRequest } from '@parking/shared-types';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParkingSessionsService } from './parking-sessions.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class ParkingSessionsController {
  constructor(private readonly service: ParkingSessionsService) {}

  @Get('quote')
  quote(@Query('zoneId') zoneId: string, @Query('minutes') minutes: string) {
    return this.service.quote(zoneId, Number(minutes));
  }

  @Get('active')
  async active(@CurrentUser() user: { id: string }) {
    return (await this.service.getActiveForUser(user.id)) ?? null;
  }

  @Get()
  list(@CurrentUser() user: { id: string }) {
    return this.service.listForUser(user.id);
  }

  @Post()
  start(@CurrentUser() user: { id: string }, @Body() body: StartSessionRequest) {
    return this.service.start(user.id, body);
  }

  @Post('extend')
  extend(@Body() body: ExtendSessionRequest) {
    return this.service.extend(body);
  }

  @Post(':id/end')
  end(@Param('id') id: string) {
    return this.service.end(id);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const s = await this.service.get(id);
    if (!s) throw new NotFoundException();
    return s;
  }
}
