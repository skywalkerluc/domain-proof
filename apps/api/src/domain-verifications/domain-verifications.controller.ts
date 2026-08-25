import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { normalizeDomain } from './domain-name';

type DomainVerification = {
  id: string;
  domain: string;
  status: 'pending';
  createdAt: string;
};

@Controller('domain-verifications')
export class DomainVerificationsController {
  @Post()
  create(@Body() body: unknown): DomainVerification {
    if (
      typeof body !== 'object' ||
      body === null ||
      !('domain' in body) ||
      typeof body.domain !== 'string' ||
      body.domain.trim() === ''
    ) {
      throw new BadRequestException({
        code: 'domain_required',
        field: 'domain',
        message: 'Enter a domain to continue.',
      });
    }

    const domain = normalizeDomain(body.domain);

    if (domain === null) {
      throw new BadRequestException({
        code: 'invalid_domain',
        field: 'domain',
        message: 'Enter a domain like example.com, without a protocol or path.',
      });
    }

    return {
      id: randomUUID(),
      domain,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }
}
