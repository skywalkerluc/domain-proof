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

const DISPLAYABLE_ERROR_CODES = new Set([
  'domain_required',
  'invalid_domain',
  'unsafe_domain_characters',
  'invalid_verification_id',
  'verification_not_found',
]);

export class DomainVerificationRequestError extends Error {
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
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    value.code === 'check_cooldown' &&
    'retryAfterSeconds' in value &&
    typeof value.retryAfterSeconds === 'number'
  );
}

function errorFromPayload(
  payload: unknown,
  fallback: string,
): DomainVerificationRequestError {
  if (isCooldownError(payload)) {
    const unit = payload.retryAfterSeconds === 1 ? 'second' : 'seconds';

    return new DomainVerificationRequestError(
      `Wait ${payload.retryAfterSeconds} ${unit} before checking DNS again.`,
      false,
      payload.code,
    );
  }

  if (isDisplayableApiError(payload)) {
    return new DomainVerificationRequestError(
      payload.message,
      false,
      payload.code,
    );
  }

  return new DomainVerificationRequestError(fallback, false);
}

async function requestDomainVerification(
  url: string,
  fallback: string,
  init?: RequestInit,
): Promise<DomainVerification> {
  let response: Response;

  try {
    response = init === undefined ? await fetch(url) : await fetch(url, init);
  } catch {
    throw new DomainVerificationRequestError(fallback, true);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw errorFromPayload(payload, fallback);
  }

  if (!isDomainVerification(payload)) {
    throw new DomainVerificationRequestError(fallback, false);
  }

  return payload;
}

export async function startDomainVerification(
  domain: string,
): Promise<DomainVerification> {
  return requestDomainVerification('/api/domain-verifications', GENERIC_ERROR, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });
}

export async function getDomainVerification(
  id: string,
): Promise<DomainVerification> {
  return requestDomainVerification(
    `/api/domain-verifications/${id}`,
    GENERIC_RETRIEVAL_ERROR,
  );
}

export async function checkDomainVerification(
  id: string,
): Promise<DomainVerification> {
  return requestDomainVerification(
    `/api/domain-verifications/${id}/checks`,
    GENERIC_CHECK_ERROR,
    { method: 'POST' },
  );
}
