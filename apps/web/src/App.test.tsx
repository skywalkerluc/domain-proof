import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from './App';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

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
    expect(screen.getByText('_domain-proof.example.com')).toBeTruthy();
    expect(screen.getByText(`domain-proof=${'a'.repeat(43)}`)).toBeTruthy();
    expect(
      screen.getByText(
        /This record does not change where your website or email traffic goes.*You don't need to change any other DNS records/,
      ),
    ).toBeTruthy();
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
    expect(writeText).toHaveBeenCalledWith('_domain-proof.example.com');
    expect(
      screen.getByRole('button', { name: 'Record name copied' }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole('button', { name: 'Copy record value' }),
    );
    expect(writeText).toHaveBeenCalledWith(
      `domain-proof=${'a'.repeat(43)}`,
    );
  });

  it('shows an actionable message for a verification that no longer exists', async () => {
    const id = '4f0c4f08-5c04-48aa-a9fd-b3a340582a95';
    window.history.replaceState(null, '', `/verifications/${id}`);
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

    renderApp();

    expect((await screen.findByRole('alert')).textContent).toBe(
      'This domain verification could not be found.',
    );
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
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));
    const user = userEvent.setup();

    renderApp();

    await user.type(screen.getByLabelText('Domain'), 'example.com');
    await user.click(
      screen.getByRole('button', { name: 'Start verification' }),
    );

    expect((await screen.findByRole('alert')).textContent).toBe(
      "We couldn't start the verification. Please try again in a moment.",
    );
  });
});
