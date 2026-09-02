import {
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  DomainVerification,
  DomainVerificationCheckOutcome,
  DomainVerificationPendingCheckOutcome,
} from '@domain-proof/contracts';

import type { DomainVerification as PersistedDomainVerification } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';
import {
  createDomainVerificationChallengeToken,
  toDomainVerificationDnsRecord,
} from './domain-verification-challenge';
import {
  DOMAIN_VERIFICATION_DNS_OPTIONS,
  DOMAIN_VERIFICATION_DNS_RESOLVER,
  type DomainVerificationDnsOptions,
  type DomainVerificationDnsResolver,
} from './domain-verification-dns-resolver';

export type { DomainVerification, DomainVerificationCheckOutcome };

const CHECK_COOLDOWN_MS = 10_000;

function dnsErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function isPendingCheckOutcome(
  outcome: DomainVerificationCheckOutcome,
): outcome is DomainVerificationPendingCheckOutcome {
  switch (outcome) {
    case 'record_not_found':
    case 'record_mismatch':
    case 'lookup_error':
      return true;
    case 'verified':
      return false;
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

function toDomainVerification(
  verification: PersistedDomainVerification,
): DomainVerification {
  const dnsRecord = toDomainVerificationDnsRecord(
    verification.domain,
    verification.challengeToken,
  );

  if (verification.status === 'verified' && verification.verifiedAt) {
    return {
      id: verification.id,
      domain: verification.domain,
      status: 'verified',
      createdAt: verification.createdAt.toISOString(),
      verifiedAt: verification.verifiedAt.toISOString(),
      dnsRecord,
      lastCheck: {
        outcome: 'verified',
        checkedAt: (
          verification.lastCheckedAt ?? verification.verifiedAt
        ).toISOString(),
      },
    };
  }

  if (
    verification.lastCheckOutcome &&
    isPendingCheckOutcome(verification.lastCheckOutcome) &&
    verification.lastCheckedAt
  ) {
    return {
      id: verification.id,
      domain: verification.domain,
      status: 'pending',
      createdAt: verification.createdAt.toISOString(),
      dnsRecord,
      lastCheck: {
        outcome: verification.lastCheckOutcome,
        checkedAt: verification.lastCheckedAt.toISOString(),
      },
    };
  }

  return {
    id: verification.id,
    domain: verification.domain,
    status: 'pending',
    createdAt: verification.createdAt.toISOString(),
    dnsRecord,
  };
}

@Injectable()
export class DomainVerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(DOMAIN_VERIFICATION_DNS_RESOLVER)
    private readonly dnsResolver: DomainVerificationDnsResolver,
    @Inject(DOMAIN_VERIFICATION_DNS_OPTIONS)
    private readonly dnsOptions: DomainVerificationDnsOptions,
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
    const verification = await this.getVerificationOrThrow(id);

    return toDomainVerification(verification);
  }

  async checkById(id: string): Promise<DomainVerification> {
    const verification = await this.getVerificationOrThrow(id);

    if (verification.status === 'verified') {
      return toDomainVerification(verification);
    }

    const checkStartedAt = new Date();
    const cooldownThreshold = new Date(
      checkStartedAt.getTime() - CHECK_COOLDOWN_MS,
    );
    const reservation = await this.prisma.domainVerification.updateMany({
      where: {
        id,
        status: 'pending',
        OR: [
          { checkStartedAt: null },
          { checkStartedAt: { lte: cooldownThreshold } },
        ],
      },
      data: { checkStartedAt },
    });

    if (reservation.count === 0) {
      const current = await this.prisma.domainVerification.findUnique({
        where: { id },
      });

      if (current?.status === 'verified') {
        return toDomainVerification(current);
      }

      const cooldownEndsAt =
        (current?.checkStartedAt?.getTime() ?? checkStartedAt.getTime()) +
        CHECK_COOLDOWN_MS;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((cooldownEndsAt - checkStartedAt.getTime()) / 1_000),
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
      txtRecords = await this.resolveTxtWithTimeout(dnsRecord.name);
    } catch (error) {
      const code = dnsErrorCode(error);

      return this.saveCheckResult(
        id,
        checkStartedAt,
        code === 'ENODATA' || code === 'ENOTFOUND'
          ? 'record_not_found'
          : 'lookup_error',
      );
    }

    if (txtRecords.length === 0) {
      return this.saveCheckResult(id, checkStartedAt, 'record_not_found');
    }

    const matches = txtRecords.some(
      (parts) => parts.join('') === dnsRecord.value,
    );

    if (!matches) {
      return this.saveCheckResult(id, checkStartedAt, 'record_mismatch');
    }

    return this.saveCheckResult(id, checkStartedAt, 'verified');
  }

  private async getVerificationOrThrow(
    id: string,
  ): Promise<PersistedDomainVerification> {
    const verification = await this.prisma.domainVerification.findUnique({
      where: { id },
    });

    if (!verification) {
      throw new NotFoundException({
        code: 'verification_not_found',
        message: 'This domain verification could not be found.',
      });
    }

    return verification;
  }

  private async resolveTxtWithTimeout(hostname: string): Promise<string[][]> {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        this.dnsResolver.resolveTxt(hostname),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            reject(Object.assign(new Error('DNS lookup timed out.'), {
              code: 'ETIMEOUT',
            }));
          }, this.dnsOptions.timeoutMs);
        }),
      ]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  private async saveCheckResult(
    id: string,
    checkStartedAt: Date,
    outcome: DomainVerificationCheckOutcome,
  ): Promise<DomainVerification> {
    const checkedAt = new Date();
    await this.prisma.domainVerification.updateMany({
      where: {
        id,
        status: 'pending',
        checkStartedAt,
      },
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

    const verification = await this.getVerificationOrThrow(id);

    return toDomainVerification(verification);
  }
}
