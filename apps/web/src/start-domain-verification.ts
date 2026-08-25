export type DomainVerification = {
  id: string;
  domain: string;
  status: 'pending';
  createdAt: string;
};

const GENERIC_ERROR =
  "We couldn't start the verification. Please try again in a moment.";

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
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
    value.status === 'pending' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
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
    throw new Error(GENERIC_ERROR);
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
