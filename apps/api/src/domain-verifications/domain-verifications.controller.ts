import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';

import { DomainVerificationDomainPipe } from './domain-verification-domain.pipe';
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
  create(
    @Body(DomainVerificationDomainPipe) domain: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.create(domain);
  }

  @Get(':id')
  findById(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.findById(id);
  }

  @Post(':id/checks')
  @HttpCode(HttpStatus.OK)
  check(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.checkById(id);
  }
}
