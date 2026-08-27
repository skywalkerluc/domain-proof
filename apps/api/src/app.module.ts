import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { DomainVerificationsController } from './domain-verifications/domain-verifications.controller';
import {
  DOMAIN_VERIFICATION_DNS_RESOLVER,
  NodeDomainVerificationDnsResolver,
} from './domain-verifications/domain-verification-dns-resolver';
import { DomainVerificationsService } from './domain-verifications/domain-verifications.service';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [AppController, DomainVerificationsController],
  providers: [
    DomainVerificationsService,
    PrismaService,
    {
      provide: DOMAIN_VERIFICATION_DNS_RESOLVER,
      useClass: NodeDomainVerificationDnsResolver,
    },
  ],
})
export class AppModule {}
