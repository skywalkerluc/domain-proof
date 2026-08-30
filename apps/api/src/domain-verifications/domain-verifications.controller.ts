import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';

import { DomainVerificationDomainPipe } from './domain-verification-domain.pipe';
import {
  CheckCooldownResponse,
  CreateDomainVerificationRequest,
  DOMAIN_VERIFICATION_RESPONSE_SCHEMA,
  DomainVerificationErrorResponse,
  PendingDomainVerificationLastCheck,
  PendingDomainVerificationResponse,
  VerifiedDomainVerificationLastCheck,
  VerifiedDomainVerificationResponse,
} from './domain-verification.openapi';
import {
  type DomainVerification,
  DomainVerificationsService,
} from './domain-verifications.service';

const domainVerificationIdPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException({
      code: 'invalid_verification_id',
      message: 'Enter a valid verification ID.',
    }),
});

@ApiTags('Domain verifications')
@ApiExtraModels(
  PendingDomainVerificationLastCheck,
  VerifiedDomainVerificationLastCheck,
  PendingDomainVerificationResponse,
  VerifiedDomainVerificationResponse,
)
@Controller('domain-verifications')
export class DomainVerificationsController {
  constructor(
    private readonly domainVerifications: DomainVerificationsService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a domain verification',
    description:
      'Normalizes the domain and creates a unique DNS TXT challenge.',
  })
  @ApiBody({ type: CreateDomainVerificationRequest })
  @ApiCreatedResponse({
    description: 'The pending verification and its TXT challenge.',
    type: PendingDomainVerificationResponse,
  })
  @ApiBadRequestResponse({
    description: 'The domain is missing, invalid, or contains unsafe characters.',
    type: DomainVerificationErrorResponse,
  })
  create(
    @Body(DomainVerificationDomainPipe) domain: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.create(domain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a domain verification' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Verification ID.' })
  @ApiOkResponse({ schema: DOMAIN_VERIFICATION_RESPONSE_SCHEMA })
  @ApiBadRequestResponse({
    description: 'The ID is not a valid UUID.',
    type: DomainVerificationErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'No verification exists for this ID.',
    type: DomainVerificationErrorResponse,
  })
  findById(
    @Param('id', domainVerificationIdPipe) id: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.findById(id);
  }

  @Post(':id/checks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check a domain verification',
    description:
      'Queries public DNS for the expected TXT challenge and returns the latest state.',
  })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Verification ID.' })
  @ApiOkResponse({ schema: DOMAIN_VERIFICATION_RESPONSE_SCHEMA })
  @ApiBadRequestResponse({
    description: 'The ID is not a valid UUID.',
    type: DomainVerificationErrorResponse,
  })
  @ApiNotFoundResponse({
    description: 'No verification exists for this ID.',
    type: DomainVerificationErrorResponse,
  })
  @ApiTooManyRequestsResponse({
    description: 'The verification was checked too recently.',
    type: CheckCooldownResponse,
  })
  check(
    @Param('id', domainVerificationIdPipe) id: string,
  ): Promise<DomainVerification> {
    return this.domainVerifications.checkById(id);
  }
}
