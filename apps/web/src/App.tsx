import { useMutation } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';

import { startDomainVerification } from './start-domain-verification';

export function App() {
  const [domain, setDomain] = useState('');
  const verification = useMutation({ mutationFn: startDomainVerification });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verification.mutate(domain);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-6">
          <span className="text-sm font-semibold tracking-wide">Domain Proof</span>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1fr_25rem] lg:py-24">
        <section className="max-w-xl">
          <p className="mb-4 text-sm font-medium text-sky-400">
            Domain verification
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Prove you control your domain.
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            Enter a domain to begin. In the next step, you’ll add a dedicated
            DNS record that won’t affect your website or email.
          </p>
        </section>

        <section
          aria-labelledby="start-verification-title"
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20"
        >
          <h2
            id="start-verification-title"
            className="text-lg font-semibold tracking-tight"
          >
            Start verification
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use a root domain or subdomain you can manage in DNS.
          </p>

          <form className="mt-6" onSubmit={handleSubmit}>
            <label className="text-sm font-medium" htmlFor="domain">
              Domain
            </label>
            <input
              aria-describedby="domain-hint"
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900 px-3 py-2.5 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
              id="domain"
              name="domain"
              onChange={(event) => setDomain(event.target.value)}
              placeholder="example.com"
              required
              spellCheck={false}
              type="text"
              value={domain}
            />
            <p className="mt-2 text-xs leading-5 text-slate-500" id="domain-hint">
              Don’t include https://, a port, or a path.
            </p>

            <button
              className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={verification.isPending}
              type="submit"
            >
              {verification.isPending
                ? 'Starting verification…'
                : 'Start verification'}
            </button>
          </form>

          {verification.isError ? (
            <div
              className="mt-5 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100"
              role="alert"
            >
              {verification.error.message}
            </div>
          ) : null}

          {verification.isSuccess ? (
            <div
              className="mt-5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4"
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-emerald-100">
                  Verification started
                </h2>
                <span className="rounded-full bg-amber-300/15 px-2 py-1 text-xs font-medium text-amber-200">
                  Pending
                </span>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-white">
                {verification.data.domain}
              </p>
              <p className="mt-3 text-sm leading-6 text-emerald-100/70">
                The next step is to generate the dedicated TXT record used to
                prove control.
              </p>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
