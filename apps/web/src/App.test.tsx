import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

function successfulVerificationResponse() {
  return new Response(
    JSON.stringify({
      id: '59ee312b-6761-4ce4-ae01-86093ff67c25',
      domain: 'example.com',
      status: 'pending',
      createdAt: '2026-08-25T15:00:00.000Z',
    }),
    { status: 201 },
  );
}

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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
