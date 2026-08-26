export type DomainVerification = {
  id: string;
  domain: string;
  status: 'pending';
  createdAt: string;
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

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof value.message === 'string'
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
    typeof value.createdAt === 'string' &&
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

export async function getDomainVerification(
  id: string,
): Promise<DomainVerification> {
  let response: Response;

  try {
    response = await fetch(`/api/domain-verifications/${id}`);
  } catch {
    throw new Error(GENERIC_RETRIEVAL_ERROR);
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
