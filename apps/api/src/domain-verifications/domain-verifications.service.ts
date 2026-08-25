import { Injectable, NotFoundException } from '@nestjs/common';

import type { DomainVerification as PersistedDomainVerification } from '../generated/prisma/client';
import { PrismaService } from '../prisma.service';

export type DomainVerification = {
  id: string;
  domain: string;
  status: 'pending';
  createdAt: string;
};

function toDomainVerification(
  verification: PersistedDomainVerification,
): DomainVerification {
  return {
    id: verification.id,
    domain: verification.domain,
    status: 'pending',
    createdAt: verification.createdAt.toISOString(),
  };
}

@Injectable()
export class DomainVerificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(domain: string): Promise<DomainVerification> {
    const verification = await this.prisma.domainVerification.create({
      data: { domain },
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
}
