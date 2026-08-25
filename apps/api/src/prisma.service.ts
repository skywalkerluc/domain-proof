import 'dotenv/config';

import { PrismaNeon } from '@prisma/adapter-neon';
import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { PrismaClient } from './generated/prisma/client';

function createNeonAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to start the API.');
  }

  return new PrismaNeon({ connectionString });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ adapter: createNeonAdapter() });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
