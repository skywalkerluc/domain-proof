import { Module } from '@nestjs/common';

import { PrismaService } from '../prisma.service';
import { DomainVerificationDomainPipe } from './domain-verification-domain.pipe';
import {
  DOMAIN_VERIFICATION_DNS_OPTIONS,
  DOMAIN_VERIFICATION_DNS_RESOLVER,
  NodeDomainVerificationDnsResolver,
} from './domain-verification-dns-resolver';
import { DomainVerificationsController } from './domain-verifications.controller';
import { DomainVerificationsService } from './domain-verifications.service';

@Module({
  controllers: [DomainVerificationsController],
  providers: [
    DomainVerificationsService,
    DomainVerificationDomainPipe,
    PrismaService,
    {
      provide: DOMAIN_VERIFICATION_DNS_OPTIONS,
      useValue: { timeoutMs: 5_000 },
    },
    {
      provide: DOMAIN_VERIFICATION_DNS_RESOLVER,
      useClass: NodeDomainVerificationDnsResolver,
    },
  ],
})
export class DomainVerificationsModule {}
