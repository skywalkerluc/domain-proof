import 'dotenv/config';

import { PrismaNeon } from '@prisma/adapter-neon';
import { Injectable } from '@nestjs/common';

import { PrismaClient } from './generated/prisma/client';

function createNeonAdapter() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to start the API.');
  }

  return new PrismaNeon({ connectionString });
}

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({ adapter: createNeonAdapter() });
  }
}
