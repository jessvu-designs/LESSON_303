import { Injectable, NotFoundException } from '@nestjs/common';
import { MockConnector } from './connectors/mock.connector';
import { SeattleConnector } from './connectors/seattle.connector';
import type { ParkingConnector } from './parking-connector.interface';

/**
 * Routes requests to the correct connector per provider.
 * Add real connectors (Pay2Park, ParkMobile, city-direct, etc.) here.
 */
@Injectable()
export class ProvidersService {
  private connectors = new Map<string, ParkingConnector>();

  constructor(
    private readonly mock: MockConnector,
    private readonly seattle: SeattleConnector,
  ) {
    this.register(this.mock);
    this.register(this.seattle);
  }

  register(connector: ParkingConnector) {
    this.connectors.set(connector.providerId, connector);
  }

  get(providerId: string): ParkingConnector {
    const c = this.connectors.get(providerId);
    if (!c) throw new NotFoundException(`Provider not registered: ${providerId}`);
    return c;
  }

  list() {
    return Array.from(this.connectors.values()).map((c) => ({
      id: c.providerId,
      name: c.name,
    }));
  }

  all(): ParkingConnector[] {
    return Array.from(this.connectors.values());
  }

  /** Default connector while a routing/geofence service is not yet built. */
  default(): ParkingConnector {
    return this.mock;
  }
}
