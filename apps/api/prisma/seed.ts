// Seed script: demo user, default vehicle, two zones, and a historical session.
// Run with `pnpm --filter @parking/api db:seed` (or `prisma db seed`).
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ---- demo user ----
  const passwordHash = await bcrypt.hash('demo1234', 8);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    create: { email: 'demo@example.com', name: 'Demo Driver', passwordHash },
    update: {},
  });

  // ---- default vehicle ----
  const existingVehicle = await prisma.parkingVehicle.findFirst({
    where: { userId: demo.id },
  });
  const vehicle =
    existingVehicle ??
    (await prisma.parkingVehicle.create({
      data: {
        userId: demo.id,
        licensePlate: 'AKZ-3914',
        state: 'WA',
        nickname: 'My Car',
        isDefault: true,
      },
    }));

  // ---- zones ----
  await prisma.parkingZone.upsert({
    where: { id: 'zone_1042' },
    create: {
      id: 'zone_1042',
      cityId: 'city_sea',
      providerId: 'prov_mock',
      code: '1042',
      displayName: 'Pike St & 4th Ave',
      address: '400 Pike St, Seattle, WA',
      latitude: 47.6105,
      longitude: -122.3365,
      hourlyCents: 350,
      currency: 'USD',
      maxSessionMinutes: 240,
      allowsExtension: true,
      rulesNotes: 'Free Sundays. Street cleaning Tue 9–11.',
    },
    update: {},
  });
  await prisma.parkingZone.upsert({
    where: { id: 'zone_2210' },
    create: {
      id: 'zone_2210',
      cityId: 'city_sea',
      providerId: 'prov_mock',
      code: '2210',
      displayName: 'Capitol Hill — Pine St',
      address: '1500 E Pine St, Seattle, WA',
      latitude: 47.6154,
      longitude: -122.3175,
      hourlyCents: 250,
      currency: 'USD',
      maxSessionMinutes: 120,
      allowsExtension: false,
    },
    update: {},
  });

  // ---- one historical session so History isn't empty ----
  const hasHistory = await prisma.parkingSession.findFirst({
    where: { userId: demo.id, status: 'ended' },
  });
  if (!hasHistory) {
    const started = new Date(Date.now() - 1000 * 60 * 60 * 28);
    const ended = new Date(Date.now() - 1000 * 60 * 60 * 26);
    await prisma.parkingSession.create({
      data: {
        userId: demo.id,
        vehicleId: vehicle.id,
        zoneId: 'zone_1042',
        providerId: 'prov_mock',
        startedAt: started,
        expiresAt: ended,
        status: 'ended',
        totalPaidCents: 700,
        currency: 'USD',
      },
    });
  }

  // ---- ensure the demo account starts with NO active parking ----
  // Any leftover active/expired-but-not-flipped sessions get closed out so
  // a fresh sign-in always lands on a clean Home screen.
  await prisma.parkingSession.updateMany({
    where: { userId: demo.id, status: 'active' },
    data: { status: 'ended' },
  });

  // eslint-disable-next-line no-console
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
