import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { PageLayout } from '../components/PageLayout';
import { startDomainVerification } from '../domain-verifications-api';
import {
  readRecentVerification,
  saveRecentVerification,
} from '../recent-verification';
import { verificationQueryKey } from '../verification-query-key';

export function StartVerificationPage() {
  const [domain, setDomain] = useState('');
  const [recentVerification] = useState(readRecentVerification);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const verification = useMutation({
    mutationFn: startDomainVerification,
    onSuccess: (created) => {
      saveRecentVerification({ id: created.id, domain: created.domain });
      queryClient.setQueryData(verificationQueryKey(created.id), created);
      void navigate(`/verifications/${created.id}`);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    verification.mutate(domain);
  }

  return (
    <PageLayout
      description="Enter a domain to begin. You’ll verify ownership by adding a TXT record to DNS."
      title="Prove you control your domain."
    >
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
            aria-describedby={
              verification.isError
                ? 'domain-hint domain-error'
                : 'domain-hint'
            }
            aria-invalid={verification.isError || undefined}
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

        {recentVerification ? (
          <Link
            className="mt-5 inline-flex text-sm font-medium text-sky-300 hover:text-sky-200"
            to={`/verifications/${recentVerification.id}`}
          >
            View recent verification for {recentVerification.domain}
          </Link>
        ) : null}

        {verification.isError ? (
          <div
            className="mt-5 rounded-lg border border-red-400/20 bg-red-400/10 p-4 text-sm leading-6 text-red-100"
            id="domain-error"
            role="alert"
          >
            {verification.error.message}
          </div>
        ) : null}
      </section>
    </PageLayout>
  );
}
