import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import type { DomainVerification } from '@domain-proof/contracts';

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

export class DomainVerificationLastCheck {
  @ApiProperty({
    enum: [
      'verified',
      'record_not_found',
      'record_mismatch',
      'lookup_error',
    ],
  })
  outcome!:
    | 'verified'
    | 'record_not_found'
    | 'record_mismatch'
    | 'lookup_error';

  @ApiProperty({ format: 'date-time' })
  checkedAt!: string;
}

export class DomainVerificationResponse {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'example.com' })
  domain!: string;

  @ApiProperty({ enum: ['pending', 'verified'] })
  status!: DomainVerification['status'];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: DomainVerificationDnsRecord })
  dnsRecord!: DomainVerificationDnsRecord;

  @ApiPropertyOptional({ format: 'date-time' })
  verifiedAt?: string;

  @ApiPropertyOptional({ type: DomainVerificationLastCheck })
  lastCheck?: DomainVerificationLastCheck;
}

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
