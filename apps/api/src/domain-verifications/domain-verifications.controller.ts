import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { normalizeDomain } from './domain-name';
import {
  type DomainVerification,
  DomainVerificationsService,
} from './domain-verifications.service';

@Controller('domain-verifications')
export class DomainVerificationsController {
  constructor(
    private readonly domainVerifications: DomainVerificationsService,
  ) {}

  @Post()
  create(@Body() body: unknown): Promise<DomainVerification> {
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

    return this.domainVerifications.create(domain);
  }

  @Get(':id')
  findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.findById(id);
  }
}
