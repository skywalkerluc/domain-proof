const RECENT_VERIFICATION_KEY = 'domain-proof:recent-verification';

export type RecentVerification = {
  id: string;
  domain: string;
};

function isRecentVerification(value: unknown): value is RecentVerification {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'domain' in value &&
    typeof value.domain === 'string'
  );
}

export function readRecentVerification(): RecentVerification | null {
  try {
    const stored = window.localStorage.getItem(RECENT_VERIFICATION_KEY);

    if (!stored) {
      return null;
    }

    const value: unknown = JSON.parse(stored);
    return isRecentVerification(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveRecentVerification(
  verification: RecentVerification,
): void {
  try {
    window.localStorage.setItem(
      RECENT_VERIFICATION_KEY,
      JSON.stringify(verification),
    );
  } catch {
    // The verification URL remains the durable source of truth.
  }
}

export function clearRecentVerification(id: string): void {
  const recent = readRecentVerification();

  if (recent?.id !== id) {
    return;
  }

  try {
    window.localStorage.removeItem(RECENT_VERIFICATION_KEY);
  } catch {
    // Storage can be unavailable without blocking the verification flow.
  }
}
