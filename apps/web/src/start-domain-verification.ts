export type DomainVerification = {
  id: string;
  domain: string;
  status: 'pending' | 'verified';
  createdAt: string;
  verifiedAt?: string;
  lastCheck?: {
    outcome:
      | 'verified'
      | 'record_not_found'
      | 'record_mismatch'
      | 'lookup_error';
    checkedAt: string;
  };
  dnsRecord: {
    type: 'TXT';
    name: string;
    value: string;
  };
};

const GENERIC_ERROR =
  "We couldn't start the verification. Please try again in a moment.";
const GENERIC_RETRIEVAL_ERROR =
  "We couldn't load this verification. Please try again in a moment.";
const GENERIC_CHECK_ERROR =
  "We couldn't check DNS. Please try again in a moment.";

class DomainVerificationRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'DomainVerificationRequestError';
  }
}

export function shouldRetryDomainVerificationRequest(
  failureCount: number,
  error: Error,
): boolean {
  return (
    failureCount < 1 &&
    error instanceof DomainVerificationRequestError &&
    error.retryable
  );
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function isCooldownError(
  value: unknown,
): value is { code: 'check_cooldown'; retryAfterSeconds: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    value.code === 'check_cooldown' &&
    'retryAfterSeconds' in value &&
    typeof value.retryAfterSeconds === 'number'
  );
}

function isDnsRecord(
  value: unknown,
): value is DomainVerification['dnsRecord'] {
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

function isLastCheck(value: unknown): value is NonNullable<
  DomainVerification['lastCheck']
> {
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

function isDomainVerification(value: unknown): value is DomainVerification {
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

export async function startDomainVerification(
  domain: string,
): Promise<DomainVerification> {
  let response: Response;

  try {
    response = await fetch('/api/domain-verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
  } catch {
    throw new DomainVerificationRequestError(GENERIC_ERROR, true);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(hasMessage(payload) ? payload.message : GENERIC_ERROR);
  }

  if (!isDomainVerification(payload)) {
    throw new Error(GENERIC_ERROR);
  }

  return payload;
}

export async function getDomainVerification(
  id: string,
): Promise<DomainVerification> {
  let response: Response;

  try {
    response = await fetch(`/api/domain-verifications/${id}`);
  } catch {
    throw new DomainVerificationRequestError(GENERIC_RETRIEVAL_ERROR, true);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      hasMessage(payload) ? payload.message : GENERIC_RETRIEVAL_ERROR,
    );
  }

  if (!isDomainVerification(payload)) {
    throw new Error(GENERIC_RETRIEVAL_ERROR);
  }

  return payload;
}

export async function checkDomainVerification(
  id: string,
): Promise<DomainVerification> {
  let response: Response;

  try {
    response = await fetch(`/api/domain-verifications/${id}/checks`, {
      method: 'POST',
    });
  } catch {
    throw new DomainVerificationRequestError(GENERIC_CHECK_ERROR, true);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (isCooldownError(payload)) {
      const unit = payload.retryAfterSeconds === 1 ? 'second' : 'seconds';

      throw new Error(
        `Wait ${payload.retryAfterSeconds} ${unit} before checking DNS again.`,
      );
    }

    throw new Error(hasMessage(payload) ? payload.message : GENERIC_CHECK_ERROR);
  }

  if (!isDomainVerification(payload)) {
    throw new Error(GENERIC_CHECK_ERROR);
  }

  return payload;
}
