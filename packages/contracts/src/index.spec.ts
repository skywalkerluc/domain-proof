import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isDomainVerification } from './index.ts';

const dnsRecord = {
  type: 'TXT' as const,
  name: '_domain-proof.example.com',
  value: 'domain-proof=token',
};

const pendingBase = {
  id: '59ee312b-6761-4ce4-ae01-86093ff67c25',
  domain: 'example.com',
  status: 'pending' as const,
  createdAt: '2026-08-25T15:00:00.000Z',
  dnsRecord,
};

const verifiedBase = {
  ...pendingBase,
  status: 'verified' as const,
  verifiedAt: '2026-08-26T19:00:00.000Z',
  lastCheck: {
    outcome: 'verified' as const,
    checkedAt: '2026-08-26T19:00:00.000Z',
  },
};

describe('isDomainVerification', () => {
  it('accepts a pending verification without a completed check', () => {
    assert.equal(isDomainVerification(pendingBase), true);
  });

  it('accepts a pending verification with a failed check', () => {
    assert.equal(
      isDomainVerification({
        ...pendingBase,
        lastCheck: {
          outcome: 'record_not_found',
          checkedAt: '2026-08-26T19:00:00.000Z',
        },
      }),
      true,
    );
  });

  it('rejects a pending verification with a verified check outcome', () => {
    assert.equal(
      isDomainVerification({
        ...pendingBase,
        lastCheck: {
          outcome: 'verified',
          checkedAt: '2026-08-26T19:00:00.000Z',
        },
      }),
      false,
    );
  });

  it('accepts a verified verification with verifiedAt and a successful check', () => {
    assert.equal(isDomainVerification(verifiedBase), true);
  });

  it('rejects a verified verification without verifiedAt', () => {
    const { verifiedAt: _, ...withoutVerifiedAt } = verifiedBase;
    assert.equal(isDomainVerification(withoutVerifiedAt), false);
  });

  it('rejects a verified verification without a successful lastCheck', () => {
    const { lastCheck: _, ...withoutLastCheck } = verifiedBase;
    assert.equal(isDomainVerification(withoutLastCheck), false);
  });
});
