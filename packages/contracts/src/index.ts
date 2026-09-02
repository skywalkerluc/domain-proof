export const DOMAIN_VERIFICATION_STATUSES = ['pending', 'verified'] as const;
export const DOMAIN_VERIFICATION_PENDING_CHECK_OUTCOMES = [
  'record_not_found',
  'record_mismatch',
  'lookup_error',
] as const;
export const DOMAIN_VERIFICATION_CHECK_OUTCOMES = [
  'verified',
  ...DOMAIN_VERIFICATION_PENDING_CHECK_OUTCOMES,
] as const;

export type DomainVerificationStatus =
  (typeof DOMAIN_VERIFICATION_STATUSES)[number];
export type DomainVerificationPendingCheckOutcome =
  (typeof DOMAIN_VERIFICATION_PENDING_CHECK_OUTCOMES)[number];
export type DomainVerificationCheckOutcome =
  (typeof DOMAIN_VERIFICATION_CHECK_OUTCOMES)[number];

export type DomainVerificationDnsRecord = {
  type: 'TXT';
  name: string;
  value: string;
};

export type DomainVerificationLastCheck = {
  outcome: DomainVerificationCheckOutcome;
  checkedAt: string;
};

type DomainVerificationBase = {
  id: string;
  domain: string;
  createdAt: string;
  dnsRecord: DomainVerificationDnsRecord;
};

export type PendingDomainVerification = DomainVerificationBase & {
  status: 'pending';
  lastCheck?: {
    outcome: DomainVerificationPendingCheckOutcome;
    checkedAt: string;
  };
};

export type VerifiedDomainVerification = DomainVerificationBase & {
  status: 'verified';
  verifiedAt: string;
  lastCheck: {
    outcome: 'verified';
    checkedAt: string;
  };
};

export type DomainVerification =
  | PendingDomainVerification
  | VerifiedDomainVerification;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isDnsRecord(value: unknown): value is DomainVerificationDnsRecord {
  return (
    isRecord(value) &&
    value.type === 'TXT' &&
    typeof value.name === 'string' &&
    typeof value.value === 'string'
  );
}

function isPendingCheckOutcome(
  value: unknown,
): value is DomainVerificationPendingCheckOutcome {
  return (
    value === 'record_not_found' ||
    value === 'record_mismatch' ||
    value === 'lookup_error'
  );
}

function isLastCheck(
  value: unknown,
  outcomePredicate: (outcome: unknown) => boolean,
): value is DomainVerificationLastCheck {
  return (
    isRecord(value) &&
    outcomePredicate(value.outcome) &&
    typeof value.checkedAt === 'string'
  );
}

function isBase(value: Record<string, unknown>): boolean {
  return (
    typeof value.id === 'string' &&
    typeof value.domain === 'string' &&
    typeof value.createdAt === 'string' &&
    isDnsRecord(value.dnsRecord)
  );
}

export function isDomainVerification(
  value: unknown,
): value is DomainVerification {
  if (!isRecord(value) || !isBase(value)) {
    return false;
  }

  if (value.status === 'pending') {
    return (
      !('verifiedAt' in value) &&
      (!('lastCheck' in value) ||
        isLastCheck(value.lastCheck, isPendingCheckOutcome))
    );
  }

  return (
    value.status === 'verified' &&
    typeof value.verifiedAt === 'string' &&
    isLastCheck(value.lastCheck, (outcome) => outcome === 'verified')
  );
}
