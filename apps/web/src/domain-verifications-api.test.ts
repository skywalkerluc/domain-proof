import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DomainVerificationRequestError,
  checkDomainVerification,
  getDomainVerification,
  shouldRetryDomainVerificationRequest,
  startDomainVerification,
} from './domain-verifications-api';

describe('domain-verifications-api', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the same retryable error type for displayable HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'invalid_domain',
            message: 'Enter a domain like example.com, without a protocol or path.',
          }),
          { status: 400 },
        ),
      ),
    );

    await expect(startDomainVerification('https://example.com')).rejects.toMatchObject({
      name: 'DomainVerificationRequestError',
      retryable: false,
      code: 'invalid_domain',
    });
  });

  it('marks network failures as retryable and HTTP failures as not', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    try {
      await getDomainVerification('59ee312b-6761-4ce4-ae01-86093ff67c25');
      throw new Error('expected getDomainVerification to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainVerificationRequestError);
      expect(
        shouldRetryDomainVerificationRequest(0, error as DomainVerificationRequestError),
      ).toBe(true);
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'verification_not_found',
            message: 'This domain verification could not be found.',
          }),
          { status: 404 },
        ),
      ),
    );

    try {
      await getDomainVerification('59ee312b-6761-4ce4-ae01-86093ff67c25');
      throw new Error('expected getDomainVerification to reject');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainVerificationRequestError);
      expect(
        shouldRetryDomainVerificationRequest(0, error as DomainVerificationRequestError),
      ).toBe(false);
    }
  });

  it('turns a cooldown payload into a DomainVerificationRequestError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'check_cooldown',
            message: 'Wait before checking DNS again.',
            retryAfterSeconds: 1,
          }),
          { status: 429 },
        ),
      ),
    );

    await expect(
      checkDomainVerification('59ee312b-6761-4ce4-ae01-86093ff67c25'),
    ).rejects.toEqual(
      expect.objectContaining({
        name: 'DomainVerificationRequestError',
        message: 'Wait 1 second before checking DNS again.',
        retryable: false,
        code: 'check_cooldown',
      }),
    );
  });
});
