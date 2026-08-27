import {
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DomainVerification as PersistedDomainVerification } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import {
  createDomainVerificationChallengeToken,
  type DomainVerificationDnsRecord,
  toDomainVerificationDnsRecord,
} from './domain-verification-challenge';
import {
  DOMAIN_VERIFICATION_DNS_RESOLVER,
  type DomainVerificationDnsResolver,
} from './domain-verification-dns-resolver';

export type DomainVerificationCheckOutcome =
  | 'verified'
  | 'record_not_found'
  | 'record_mismatch'
  | 'lookup_error';

const CHECK_COOLDOWN_MS = 10_000;

function dnsErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

export type DomainVerification = {
  id: string;
  domain: string;
  status: 'pending' | 'verified';
  createdAt: string;
  dnsRecord: DomainVerificationDnsRecord;
  verifiedAt?: string;
  lastCheck?: {
    outcome: DomainVerificationCheckOutcome;
    checkedAt: string;
  };
};

function toDomainVerification(
  verification: PersistedDomainVerification,
): DomainVerification {
  const response: DomainVerification = {
    id: verification.id,
    domain: verification.domain,
    status: verification.status,
    createdAt: verification.createdAt.toISOString(),
    dnsRecord: toDomainVerificationDnsRecord(
      verification.domain,
      verification.challengeToken,
    ),
  };

  if (verification.verifiedAt) {
    response.verifiedAt = verification.verifiedAt.toISOString();
  }

  if (verification.lastCheckOutcome && verification.lastCheckedAt) {
    response.lastCheck = {
      outcome: verification.lastCheckOutcome,
      checkedAt: verification.lastCheckedAt.toISOString(),
    };
  }

  return response;
}

@Injectable()
export class DomainVerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOMAIN_VERIFICATION_DNS_RESOLVER)
    private readonly dnsResolver: DomainVerificationDnsResolver,
  ) {}

  async create(domain: string): Promise<DomainVerification> {
    const verification = await this.prisma.domainVerification.create({
      data: {
        domain,
        challengeToken: createDomainVerificationChallengeToken(),
      },
    });

    return toDomainVerification(verification);
  }

  async findById(id: string): Promise<DomainVerification> {
    const verification = await this.prisma.domainVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException({
        code: 'verification_not_found',
        message: 'This domain verification could not be found.',
      });
    }

    return toDomainVerification(verification);
  }

  async checkById(id: string): Promise<DomainVerification> {
    const verification = await this.prisma.domainVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException({
        code: 'verification_not_found',
        message: 'This domain verification could not be found.',
      });
    }

    if (verification.status === 'verified') {
      return toDomainVerification(verification);
    }

    const checkedAt = new Date();
    const cooldownThreshold = new Date(checkedAt.getTime() - CHECK_COOLDOWN_MS);
    const reservation = await this.prisma.domainVerification.updateMany({
      where: {
        id,
        status: 'pending',
        OR: [
          { lastCheckedAt: null },
          { lastCheckedAt: { lte: cooldownThreshold } },
        ],
      },
      data: { lastCheckedAt: checkedAt },
    });

    if (reservation.count === 0) {
      const current = await this.prisma.domainVerification.findUnique({
        where: { id },
      });

      if (current?.status === 'verified') {
        return toDomainVerification(current);
      }

      const cooldownEndsAt =
        (current?.lastCheckedAt?.getTime() ?? checkedAt.getTime()) +
        CHECK_COOLDOWN_MS;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((cooldownEndsAt - checkedAt.getTime()) / 1_000),
      );

      throw new HttpException(
        {
          code: 'check_cooldown',
          message: 'Wait before checking DNS again.',
          retryAfterSeconds,
        },
        429,
      );
    }

    const dnsRecord = toDomainVerificationDnsRecord(
      verification.domain,
      verification.challengeToken,
    );
    let txtRecords: string[][];

    try {
      txtRecords = await this.dnsResolver.resolveTxt(dnsRecord.name);
    } catch (error) {
      const code = dnsErrorCode(error);

      return this.saveCheckResult(
        id,
        checkedAt,
        code === 'ENODATA' || code === 'ENOTFOUND'
          ? 'record_not_found'
          : 'lookup_error',
      );
    }

    const matches = txtRecords.some(
      (parts) => parts.join('') === dnsRecord.value,
    );

    if (!matches) {
      return this.saveCheckResult(id, checkedAt, 'record_mismatch');
    }

    return this.saveCheckResult(id, checkedAt, 'verified');
  }

  private async saveCheckResult(
    id: string,
    checkedAt: Date,
    outcome: DomainVerificationCheckOutcome,
  ): Promise<DomainVerification> {
    const verification = await this.prisma.domainVerification.update({
      where: { id },
      data:
        outcome === 'verified'
          ? {
              status: 'verified',
              verifiedAt: checkedAt,
              lastCheckedAt: checkedAt,
              lastCheckOutcome: outcome,
            }
          : {
              lastCheckedAt: checkedAt,
              lastCheckOutcome: outcome,
            },
    });

    return toDomainVerification(verification);
  }
}
