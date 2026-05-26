import 'reflect-metadata';
// Load env (DATABASE_URL, JWT_SECRET, etc.) from apps/api/.env regardless
// of cwd. Nest's runtime doesn't auto-load .env, and `pnpm --filter` may
// invoke us from the repo root.
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
// The compiled main.js lives at apps/api/dist/apps/api/src/main.js, but in
// source it's at apps/api/src/main.ts. Walk up until we find the .env.
function findEnv(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate) && fs.existsSync(path.join(dir, 'prisma'))) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
const envPath = findEnv(__dirname);
if (envPath) dotenv.config({ path: envPath });

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API ready on http://localhost:${port}`);
}
bootstrap();
