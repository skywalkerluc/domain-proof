import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { DomainVerificationsController } from './domain-verifications/domain-verifications.controller';
import { DomainVerificationsService } from './domain-verifications/domain-verifications.service';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [AppController, DomainVerificationsController],
  providers: [DomainVerificationsService, PrismaService],
})
export class AppModule {}
