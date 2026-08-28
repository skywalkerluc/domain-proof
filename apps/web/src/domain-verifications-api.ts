import {
  isDomainVerification,
  type DomainVerification,
} from '@domain-proof/contracts';

export type { DomainVerification };

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
    readonly code?: string,
  ) {
    super(message);
    this.name = 'DomainVerificationRequestError';
  }
}

export function isVerificationNotFoundError(error: unknown): boolean {
  return (
    error instanceof DomainVerificationRequestError &&
    error.code === 'verification_not_found'
  );
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

const DISPLAYABLE_ERROR_CODES = new Set([
  'domain_required',
  'invalid_domain',
  'unsafe_domain_characters',
  'invalid_verification_id',
  'verification_not_found',
]);

function isDisplayableApiError(
  value: unknown,
): value is { code: string; message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof value.code === 'string' &&
    DISPLAYABLE_ERROR_CODES.has(value.code) &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

function isCooldownError(
  value: unknown,
): value is { code: 'check_cooldown'; retryAfterSeconds: number } {
  // Cooldown stays separate because its display message includes retryAfterSeconds.
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    value.code === 'check_cooldown' &&
    'retryAfterSeconds' in value &&
    typeof value.retryAfterSeconds === 'number'
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
    throw new Error(
      isDisplayableApiError(payload) ? payload.message : GENERIC_ERROR,
    );
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
    if (isDisplayableApiError(payload)) {
      throw new DomainVerificationRequestError(
        payload.message,
        false,
        payload.code,
      );
    }

    throw new Error(GENERIC_RETRIEVAL_ERROR);
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

    throw new Error(
      isDisplayableApiError(payload) ? payload.message : GENERIC_CHECK_ERROR,
    );
  }

  if (!isDomainVerification(payload)) {
    throw new Error(GENERIC_CHECK_ERROR);
  }

  return payload;
}
