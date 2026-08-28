export type DomainVerificationCheckOutcome =
  | 'verified'
  | 'record_not_found'
  | 'record_mismatch'
  | 'lookup_error';

export type DomainVerificationDnsRecord = {
  type: 'TXT';
  name: string;
  value: string;
};

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

function isDnsRecord(value: unknown): value is DomainVerificationDnsRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'TXT' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'value' in value &&
    typeof value.value === 'string'
  );
}

function isLastCheck(
  value: unknown,
): value is NonNullable<DomainVerification['lastCheck']> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'outcome' in value &&
    (value.outcome === 'verified' ||
      value.outcome === 'record_not_found' ||
      value.outcome === 'record_mismatch' ||
      value.outcome === 'lookup_error') &&
    'checkedAt' in value &&
    typeof value.checkedAt === 'string'
  );
}

export function isDomainVerification(
  value: unknown,
): value is DomainVerification {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'domain' in value &&
    typeof value.domain === 'string' &&
    'status' in value &&
    (value.status === 'pending' || value.status === 'verified') &&
    'createdAt' in value &&
    typeof value.createdAt === 'string' &&
    (!('verifiedAt' in value) || typeof value.verifiedAt === 'string') &&
    (!('lastCheck' in value) || isLastCheck(value.lastCheck)) &&
    'dnsRecord' in value &&
    isDnsRecord(value.dnsRecord)
  );
}
