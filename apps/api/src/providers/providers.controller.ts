import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providers: ProvidersService) {}

  @Get()
  list() {
    return this.providers.list();
  }

  @Get('zones')
  async zones() {
    // Universal listing: aggregate every registered connector so the mobile
    // app sees zones from all providers in one feed.
    const all = await Promise.all(this.providers.all().map((c) => c.listZones()));
    return all.flat();
  }

  @Get('zones/:id')
  async zone(@Param('id') id: string) {
    for (const c of this.providers.all()) {
      const z = await c.getZone(id);
      if (z) return z;
    }
    throw new NotFoundException();
  }
}
