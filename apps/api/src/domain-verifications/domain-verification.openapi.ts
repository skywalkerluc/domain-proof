import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';

export class CreateDomainVerificationRequest {
  @ApiProperty({
    description: 'Root domain or subdomain to verify.',
    example: 'example.com',
  })
  domain!: string;
}

export class DomainVerificationDnsRecord {
  @ApiProperty({ enum: ['TXT'], example: 'TXT' })
  type!: 'TXT';

  @ApiProperty({ example: '_domain-proof.example.com' })
  name!: string;

  @ApiProperty({ example: 'domain-proof=<challenge-token>' })
  value!: string;
}

export class PendingDomainVerificationLastCheck {
  @ApiProperty({
    enum: ['record_not_found', 'record_mismatch', 'lookup_error'],
  })
  outcome!: 'record_not_found' | 'record_mismatch' | 'lookup_error';

  @ApiProperty({ format: 'date-time' })
  checkedAt!: string;
}

export class VerifiedDomainVerificationLastCheck {
  @ApiProperty({ enum: ['verified'] })
  outcome!: 'verified';

  @ApiProperty({ format: 'date-time' })
  checkedAt!: string;
}

export class PendingDomainVerificationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'example.com' })
  domain!: string;

  @ApiProperty({ enum: ['pending'] })
  status!: 'pending';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: DomainVerificationDnsRecord })
  dnsRecord!: DomainVerificationDnsRecord;

  @ApiPropertyOptional({ type: PendingDomainVerificationLastCheck })
  lastCheck?: PendingDomainVerificationLastCheck;
}

export class VerifiedDomainVerificationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'example.com' })
  domain!: string;

  @ApiProperty({ enum: ['verified'] })
  status!: 'verified';

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: DomainVerificationDnsRecord })
  dnsRecord!: DomainVerificationDnsRecord;

  @ApiProperty({ format: 'date-time' })
  verifiedAt!: string;

  @ApiProperty({ type: VerifiedDomainVerificationLastCheck })
  lastCheck!: VerifiedDomainVerificationLastCheck;
}

export const DOMAIN_VERIFICATION_RESPONSE_SCHEMA = {
  oneOf: [
    { $ref: getSchemaPath(PendingDomainVerificationResponse) },
    { $ref: getSchemaPath(VerifiedDomainVerificationResponse) },
  ],
  discriminator: {
    propertyName: 'status',
    mapping: {
      pending: getSchemaPath(PendingDomainVerificationResponse),
      verified: getSchemaPath(VerifiedDomainVerificationResponse),
    },
  },
};

export class DomainVerificationErrorResponse {
  @ApiProperty({
    example: 'verification_not_found',
  })
  code!: string;

  @ApiProperty({
    example: 'This domain verification could not be found.',
  })
  message!: string;

  @ApiPropertyOptional({ example: 'domain' })
  field?: string;
}

export class CheckCooldownResponse {
  @ApiProperty({ enum: ['check_cooldown'] })
  code!: 'check_cooldown';

  @ApiProperty({ example: 'Wait before checking DNS again.' })
  message!: string;

  @ApiProperty({ example: 10, minimum: 1 })
  retryAfterSeconds!: number;
}
