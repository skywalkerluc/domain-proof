import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';
import { createQueryClient } from './query-client';

function renderApp() {
  const queryClient = createQueryClient();

  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>,
  );
}

function successfulVerificationResponse() {
  return new Response(
    JSON.stringify({
      id: '59ee312b-6761-4ce4-ae01-86093ff67c25',
      domain: 'example.com',
      status: 'pending',
      createdAt: '2026-08-25T15:00:00.000Z',
      dnsRecord: {
        type: 'TXT',
        name: '_domain-proof.example.com',
        value: `domain-proof=${'a'.repeat(43)}`,
      },
    }),
    { status: 201 },
  );
}

function verifiedVerificationResponse() {
  return new Response(
    JSON.stringify({
      id: '59ee312b-6761-4ce4-ae01-86093ff67c25',
      domain: 'example.com',
      status: 'verified',
      createdAt: '2026-08-25T15:00:00.000Z',
      verifiedAt: '2026-08-26T19:00:00.000Z',
      lastCheck: {
        outcome: 'verified',
        checkedAt: '2026-08-26T19:00:00.000Z',
      },
      dnsRecord: {
        type: 'TXT',
        name: '_domain-proof.example.com',
        value: `domain-proof=${'a'.repeat(43)}`,
      },
    }),
    { status: 200 },
  );
}

function pendingCheckResponse(
  outcome: 'record_not_found' | 'record_mismatch' | 'lookup_error',
) {
  return new Response(
    JSON.stringify({
      id: '59ee312b-6761-4ce4-ae01-86093ff67c25',
      domain: 'example.com',
      status: 'pending',
      createdAt: '2026-08-25T15:00:00.000Z',
      lastCheck: {
        outcome,
        checkedAt: '2026-08-26T19:00:00.000Z',
      },
      dnsRecord: {
        type: 'TXT',
        name: '_domain-proof.example.com',
        value: `domain-proof=${'a'.repeat(43)}`,
      },
    }),
    { status: 200 },
  );
}

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'clipboard');
    window.history.replaceState(null, '', '/');
  });

  it('shows the product name', () => {
    renderApp();

    expect(screen.getByText('Domain Proof')).toBeTruthy();
  });

  it('starts a verification and shows the normalized domain', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(successfulVerificationResponse());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp();

    await user.type(screen.getByLabelText('Domain'), ' Example.COM. ');
    await user.click(
      screen.getByRole('button', { name: 'Start verification' }),
    );

    expect(fetchMock).toHaveBeenCalledWith('/api/domain-verifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: ' Example.COM. ' }),
    });
    expect(
      await screen.findByRole('heading', { name: 'Verification started' }),
    ).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
    expect(window.location.pathname).toBe(
      '/verifications/59ee312b-6761-4ce4-ae01-86093ff67c25',
    );
  });

  it('restores a verification when its URL is opened directly', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(successfulVerificationResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/domain-verifications/${id}`);
    });
    expect(
      await screen.findByRole('heading', { name: 'Verification started' }),
    ).toBeTruthy();
    expect(screen.getByText('example.com')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Add this TXT record' }),
    ).toBeTruthy();
    expect(screen.getByText('TXT')).toBeTruthy();
    expect(screen.getByText('_domain-proof')).toBeTruthy();
    expect(screen.getByText('_domain-proof.example.com')).toBeTruthy();
    expect(
      screen.getByText(
        /Use the full hostname unless yours appends a DNS zone automatically.*example\.com.*use the short host\/name.*remove that suffix from the full hostname/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(`domain-proof=${'a'.repeat(43)}`)).toBeTruthy();
    expect(
      screen.getByText(
        /This record does not change where your website or email traffic goes.*You don't need to change any other DNS records/,
      ),
    ).toBeTruthy();
  });

  it('retries a verification retrieval once after a network failure', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(successfulVerificationResponse());
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Verification started' }),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('copies the TXT record name and value', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(successfulVerificationResponse()),
    );
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Copy record name' }),
    );
    expect(writeText).toHaveBeenCalledWith('_domain-proof');
    expect(
      screen.getByRole('button', { name: 'record name copied' }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Copy full record hostname' }),
    );
    expect(writeText).toHaveBeenCalledWith('_domain-proof.example.com');

    await user.click(
      screen.getByRole('button', { name: 'Copy record value' }),
    );
    expect(writeText).toHaveBeenCalledWith(
      `domain-proof=${'a'.repeat(43)}`,
    );
  });

  it('checks DNS and shows when domain ownership is verified', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulVerificationResponse())
      .mockResolvedValueOnce(verifiedVerificationResponse());
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Check DNS' }),
    );

    expect(fetchMock).toHaveBeenLastCalledWith(
      `/api/domain-verifications/${id}/checks`,
      { method: 'POST' },
    );
    expect(
      await screen.findByRole('heading', { name: 'Domain ownership verified' }),
    ).toBeTruthy();
    expect(screen.getByText('Verified')).toBeTruthy();
  });

  it('explains when the TXT record is not visible yet and allows retry', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(successfulVerificationResponse())
        .mockResolvedValueOnce(pendingCheckResponse('record_not_found')),
    );
    const user = userEvent.setup();

    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Check DNS' }),
    );

    expect(
      await screen.findByRole('heading', {
        name: 'TXT record not found yet',
      }),
    ).toBeTruthy();
    expect(screen.getByText(/DNS changes can take time to propagate/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
  });

  it.each([
    {
      outcome: 'record_mismatch' as const,
      title: "TXT record doesn't match",
      description: /none matched the expected value/,
    },
    {
      outcome: 'lookup_error' as const,
      title: "DNS lookup couldn't be completed",
      description: /The record may be correct/,
    },
  ])(
    'explains the $outcome result and allows retry',
    async ({ description, outcome, title }) => {
      const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
      window.history.replaceState(null, '', `/verifications/${id}`);
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(successfulVerificationResponse())
          .mockResolvedValueOnce(pendingCheckResponse(outcome)),
      );
      const user = userEvent.setup();

      renderApp();

      await user.click(
        await screen.findByRole('button', { name: 'Check DNS' }),
      );

      expect(
        await screen.findByRole('heading', { name: title }),
      ).toBeTruthy();
      expect(screen.getByText(description)).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Check again' })).toBeTruthy();
    },
  );

  it('prevents a second DNS check while the first one is running', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    let resolveCheck: (response: Response) => void = () => undefined;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successfulVerificationResponse())
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveCheck = resolve;
          }),
      );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Check DNS' }),
    );

    const pendingButton = await screen.findByRole('button', {
      name: 'Checking DNS…',
    });
    expect(pendingButton).toHaveProperty('disabled', true);
    await user.click(pendingButton);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    resolveCheck(verifiedVerificationResponse());
    expect(
      await screen.findByRole('heading', { name: 'Domain ownership verified' }),
    ).toBeTruthy();
  });

  it('shows how long to wait when DNS checks are rate limited', async () => {
    const id = '59ee312b-6761-4ce4-ae01-86093ff67c25';
    window.history.replaceState(null, '', `/verifications/${id}`);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(successfulVerificationResponse())
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: 'check_cooldown',
              message: 'Wait before checking DNS again.',
              retryAfterSeconds: 10,
            }),
            { status: 429 },
          ),
        ),
    );
    const user = userEvent.setup();

    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Check DNS' }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Wait 10 seconds before checking DNS again.',
    );
  });

  it('shows an actionable message for a verification that no longer exists', async () => {
    const id = '4f0c4f08-5c04-48aa-a9fd-b3a340582a95';
    window.history.replaceState(null, '', `/verifications/${id}`);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'verification_not_found',
          message: 'This domain verification could not be found.',
        }),
        { status: 404 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'This domain verification could not be found.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the actionable validation message returned by the API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: 'invalid_domain',
            field: 'domain',
            message:
              'Enter a domain like example.com, without a protocol or path.',
          }),
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();

    renderApp();

    await user.type(screen.getByLabelText('Domain'), 'https://example.com');
    await user.click(
      screen.getByRole('button', { name: 'Start verification' }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Enter a domain like example.com, without a protocol or path.',
    );
  });

  it('prevents a second submission while verification is starting', async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    const fetchMock = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp();

    await user.type(screen.getByLabelText('Domain'), 'example.com');
    await user.click(
      screen.getByRole('button', { name: 'Start verification' }),
    );

    const pendingButton = await screen.findByRole('button', {
      name: 'Starting verification…',
    });
    expect(pendingButton).toHaveProperty('disabled', true);
    await user.click(pendingButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRequest(successfulVerificationResponse());
    expect(
      await screen.findByRole('heading', { name: 'Verification started' }),
    ).toBeTruthy();
  });

  it('uses a safe message when the API cannot be reached', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();

    renderApp();

    await user.type(screen.getByLabelText('Domain'), 'example.com');
    await user.click(
      screen.getByRole('button', { name: 'Start verification' }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      "We couldn't start the verification. Please try again in a moment.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
