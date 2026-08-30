import { randomBytes } from 'node:crypto';

import type { DomainVerificationDnsRecord } from '@domain-proof/contracts';

const CHALLENGE_BYTES = 32;
const RECORD_LABEL = '_domain-proof';
const RECORD_VALUE_PREFIX = 'domain-proof=';
const MAX_DNS_NAME_LENGTH = 253;

function recordName(domain: string): string {
  return `${RECORD_LABEL}.${domain}`;
}

export function canCreateDomainVerificationRecord(domain: string): boolean {
  return recordName(domain).length <= MAX_DNS_NAME_LENGTH;
}

export function createDomainVerificationChallengeToken(): string {
  return randomBytes(CHALLENGE_BYTES).toString('base64url');
}

export function toDomainVerificationDnsRecord(
  domain: string,
  challengeToken: string,
): DomainVerificationDnsRecord {
  return {
    type: 'TXT',
    name: recordName(domain),
    value: `${RECORD_VALUE_PREFIX}${challengeToken}`,
  };
}
